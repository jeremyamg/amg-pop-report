import { NextRequest, NextResponse } from 'next/server';
import type { Db, Document } from 'mongodb';
import clientPromise, { DB_NAME } from '@/lib/mongodb';
import { withCors, corsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

// Helper function to escape special regex characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Validate search term
function validateSearchTerm(term: any): { valid: boolean; error?: string; term?: string } {
  if (!term || typeof term !== 'string') {
    return { valid: false, error: 'Search term must be a string' };
  }
  
  const trimmed = term.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Please enter at least 2 characters' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Search term too long (max 100 characters)' };
  }
  
  const alphanumericCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount < 2) {
    return { valid: false, error: 'Please enter at least 2 letters or numbers' };
  }
  
  const blockedTerms = ['a', 'e', 'i', 'o', 'u', 't', 's', 'the', ' '];
  if (blockedTerms.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'Please be more specific' };
  }
  
  return { valid: true, term: trimmed };
}

// Log search to MongoDB. One row per term, item type, and 5-second window; the
// unique `search_dedup` index (see lib/indexes.ts) is what makes that atomic -
// a second concurrent insert for the same window fails with a duplicate-key
// error instead of producing a second row.
async function logSearch(db: Db, searchTerm: string, resultCount: number, itemType: string) {
  try {
    await db.collection('search_logs').insertOne({
      searchTerm: searchTerm.toLowerCase().trim(),
      resultCount,
      itemType,
      timestamp: new Date(),
      bucket: Math.floor(Date.now() / 5000),
    });
  } catch (error: any) {
    if (error?.code === 11000) return; // already logged within this window
    console.error('Logging error:', error);
  }
}

// The columns of the report. masterGrade is stored as an int 1-10 or the string
// 'AUTHENTIC'; anything else counts toward totals but toward no column.
const GRADE_KEYS = ['AUTHENTIC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const gradeKey = {
  $switch: {
    branches: [
      { case: { $eq: ['$masterGrade', 'AUTHENTIC'] }, then: 'AUTHENTIC' },
      { case: { $in: ['$masterGrade', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]] }, then: { $toString: '$masterGrade' } },
    ],
    default: null,
  },
};

// [[a, b], [c]] -> [a, b, c]
function flatten(arrays: Document | string): Document {
  return {
    $reduce: {
      input: arrays,
      initialValue: [],
      in: { $concatArrays: ['$$value', '$$this'] },
    },
  };
}

// Turn a list of { k: grade, v: count } tallies into the { AUTHENTIC: n, '1': n,
// ... '10': n } object the UI renders, zero-filling columns with no items. The
// tallies are already counted per grade, so this sums at most a few dozen
// numbers rather than re-scanning every item's grade at each level.
function gradeDistribution(tallies: Document | string): Document {
  return {
    $arrayToObject: {
      $map: {
        input: GRADE_KEYS,
        as: 'key',
        in: {
          k: '$$key',
          v: {
            $sum: {
              $map: {
                input: { $filter: { input: tallies, as: 't', cond: { $eq: ['$$t.k', '$$key'] } } },
                as: 't',
                in: '$$t.v',
              },
            },
          },
        },
      },
    },
  };
}

async function handleSearch(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const itemType = searchParams.get('itemType');

    // Validate search term
    const validation = validateSearchTerm(q);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const searchTerm = validation.term!;
    const escapedTerm = escapeRegex(searchTerm);
    
    if (itemType && itemType !== 'Total') {
      if (typeof itemType !== 'string' || itemType.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Invalid item type' },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise();
    const db = client.db(DB_NAME);
    
    // A case-insensitive "contains" on either name. Each clause of the $or can
    // walk that field's index instead of the whole collection.
    const searchPatterns = {
      $or: [
        { artistPopReport: { $regex: escapedTerm, $options: 'i' } },
        { albumPopReport: { $regex: escapedTerm, $options: 'i' } },
      ]
    };

    const matchQuery: any = { ...searchPatterns };

    if (itemType && itemType !== 'Total') {
      matchQuery.itemType = itemType;
    }

    const items = db.collection('items');

    // Two independent queries, run together: how many matching items there are
    // of each type (for the filter buttons, regardless of the current filter),
    // and the report itself.
    const [typeCounts, results] = await Promise.all([
      items.aggregate([
        { $match: searchPatterns },
        { $group: { _id: '$itemType', count: { $sum: 1 } } },
      ]).toArray(),

      items.aggregate([
        {
          $match: matchQuery
        },
        // Count items per artist/album/series/variation/grade. Everything after
        // this stage works with these small tallies, not the items themselves.
        {
          $group: {
            _id: {
              album: '$albumPopReport',
              artist: '$artistPopReport',
              series: '$series',
              variation: '$variation',
              grade: gradeKey
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: {
              album: '$_id.album',
              artist: '$_id.artist',
              series: '$_id.series',
              variation: '$_id.variation'
            },
            total: { $sum: '$count' },
            grades: { $push: { k: '$_id.grade', v: '$count' } }
          }
        },
        {
          $group: {
            _id: {
              album: '$_id.album',
              artist: '$_id.artist',
              series: '$_id.series'
            },
            total: { $sum: '$total' },
            grades: { $push: '$grades' },
            variations: {
              $push: {
                type: '$_id.variation',
                total: '$total',
                grades: '$grades'
              }
            }
          }
        },
        {
          $group: {
            _id: {
              album: '$_id.album',
              artist: '$_id.artist'
            },
            totalItems: { $sum: '$total' },
            grades: { $push: '$grades' },
            mediaTypes: {
              $push: {
                type: '$_id.series',
                total: '$total',
                grades: '$grades',
                variations: '$variations'
              }
            }
          }
        },
        {
          $project: {
            album: '$_id.album',
            artist: '$_id.artist',
            totalItems: 1,
            gradeDistribution: gradeDistribution(flatten(flatten('$grades'))),
            mediaTypes: {
              $map: {
                input: '$mediaTypes',
                as: 'media',
                in: {
                  type: '$$media.type',
                  total: '$$media.total',
                  gradeDistribution: gradeDistribution(flatten('$$media.grades')),
                  variations: {
                    $map: {
                      input: '$$media.variations',
                      as: 'variation',
                      in: {
                        type: '$$variation.type',
                        total: '$$variation.total',
                        gradeDistribution: gradeDistribution('$$variation.grades')
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          $sort: { artist: 1, album: 1 }
        },
        { $limit: 10000 }
      ]).toArray(),
    ]);

    const itemTypeCounts: Record<string, number> = {};
    let totalItems = 0;
    for (const { _id: type, count } of typeCounts) {
      totalItems += count;
      if (typeof type === 'string' && type.trim() !== '' && type !== 'Unknown') {
        itemTypeCounts[type] = count;
      }
    }
    const availableItemTypes = Object.keys(itemTypeCounts).sort();

    await logSearch(db, searchTerm, results.length, itemType || 'Total');

    return NextResponse.json({
      success: true,
      searchTerm: searchTerm,
      itemType: itemType || 'Total',
      availableItemTypes,
      itemTypeCounts,
      totalItems,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Wrapped so every exit path above - success, validation error, 500 - carries
// the CORS headers, rather than having to remember them at each return.
export async function GET(request: NextRequest) {
  return withCors(request, await handleSearch(request));
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}
