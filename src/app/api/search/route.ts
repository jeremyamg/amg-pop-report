import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
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

// Log search to MongoDB
async function logSearch(db: any, searchTerm: string, resultCount: number, itemType: string) {
  try {
    // Check if we already logged this exact search in the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentLog = await db.collection('search_logs').findOne({
      searchTerm: searchTerm.toLowerCase().trim(),
      itemType,
      timestamp: { $gte: fiveSecondsAgo }
    });

    if (recentLog) {
      console.log('Duplicate search detected, skipping log');
      return;
    }

    await db.collection('search_logs').insertOne({
      searchTerm: searchTerm.toLowerCase().trim(),
      resultCount,
      itemType,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
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
    const db = client.db('grading_db');
    
    const searchPatterns = {
      $or: [
        { artistPopReport: new RegExp(`^${escapedTerm}$`, 'i') },
        { artistPopReport: new RegExp(`^The ${escapedTerm}$`, 'i') },
        { artistPopReport: new RegExp(`\\b${escapedTerm}\\b`, 'i') },
        { artistPopReport: { $regex: escapedTerm, $options: 'i' } },
        { albumPopReport: new RegExp(`^${escapedTerm}$`, 'i') },
        { albumPopReport: new RegExp(`\\b${escapedTerm}\\b`, 'i') },
        { albumPopReport: { $regex: escapedTerm, $options: 'i' } }
      ]
    };

    const availableItemTypes = await db.collection('items').distinct('itemType', searchPatterns);
    const filteredItemTypes = availableItemTypes
      .filter((t: any) => t && typeof t === 'string' && t.trim() !== '' && t !== 'Unknown')
      .sort();
    
    const matchQuery: any = { ...searchPatterns };

    if (itemType && itemType !== 'Total') {
      matchQuery.itemType = itemType;
    }

    const results = await db.collection('items').aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            album: '$albumPopReport',
            artist: '$artistPopReport',
            series: '$series',
            variation: '$variation'
          },
          grades: { $push: '$masterGrade' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            album: '$_id.album',
            artist: '$_id.artist',
            series: '$_id.series'
          },
          variations: {
            $push: {
              type: '$_id.variation',
              grades: '$grades',
              count: '$count'
            }
          },
          seriesGrades: { $push: '$grades' }
        }
      },
      {
        $group: {
          _id: {
            album: '$_id.album',
            artist: '$_id.artist'
          },
          mediaTypes: {
            $push: {
              type: '$_id.series',
              variations: '$variations',
              grades: '$seriesGrades'
            }
          },
          allGrades: { $push: '$seriesGrades' }
        }
      },
      {
        $project: {
          album: '$_id.album',
          artist: '$_id.artist',
          mediaTypes: {
            $map: {
              input: '$mediaTypes',
              as: 'media',
              in: {
                type: '$$media.type',
                variations: {
                  $map: {
                    input: '$$media.variations',
                    as: 'variation',
                    in: {
                      type: '$$variation.type',
                      total: '$$variation.count',
                      gradeDistribution: {
                        $mergeObjects: [
                          {
                            AUTHENTIC: {
                              $size: {
                                $filter: {
                                  input: '$$variation.grades',
                                  as: 'g',
                                  cond: { $eq: ['$$g', 'AUTHENTIC'] }
                                }
                              }
                            }
                          },
                          {
                            $arrayToObject: {
                              $map: {
                                input: { $range: [1, 11] },
                                as: 'grade',
                                in: {
                                  k: { $toString: '$$grade' },
                                  v: {
                                    $size: {
                                      $filter: {
                                        input: '$$variation.grades',
                                        as: 'g',
                                        cond: { $eq: ['$$g', '$$grade'] }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                },
                total: { 
                  $sum: {
                    $map: {
                      input: '$$media.variations',
                      as: 'v',
                      in: '$$v.count'
                    }
                  }
                },
                gradeDistribution: {
                  $let: {
                    vars: {
                      flatGrades: {
                        $reduce: {
                          input: '$$media.grades',
                          initialValue: [],
                          in: { $concatArrays: ['$$value', '$$this'] }
                        }
                      }
                    },
                    in: {
                      $mergeObjects: [
                        {
                          AUTHENTIC: {
                            $size: {
                              $filter: {
                                input: '$$flatGrades',
                                as: 'g',
                                cond: { $eq: ['$$g', 'AUTHENTIC'] }
                              }
                            }
                          }
                        },
                        {
                          $arrayToObject: {
                            $map: {
                              input: { $range: [1, 11] },
                              as: 'grade',
                              in: {
                                k: { $toString: '$$grade' },
                                v: {
                                  $size: {
                                    $filter: {
                                      input: '$$flatGrades',
                                      as: 'g',
                                      cond: { $eq: ['$$g', '$$grade'] }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          totalItems: {
            $sum: {
              $map: {
                input: '$mediaTypes',
                as: 'media',
                in: {
                  $sum: {
                    $map: {
                      input: '$$media.variations',
                      as: 'v',
                      in: '$$v.count'
                    }
                  }
                }
              }
            }
          },
          gradeDistribution: {
            $let: {
              vars: {
                flatGrades: {
                  $reduce: {
                    input: {
                      $reduce: {
                        input: '$allGrades',
                        initialValue: [],
                        in: { $concatArrays: ['$$value', '$$this'] }
                      }
                    },
                    initialValue: [],
                    in: { $concatArrays: ['$$value', '$$this'] }
                  }
                }
              },
              in: {
                $mergeObjects: [
                  {
                    AUTHENTIC: {
                      $size: {
                        $filter: {
                          input: '$$flatGrades',
                          as: 'g',
                          cond: { $eq: ['$$g', 'AUTHENTIC'] }
                        }
                      }
                    }
                  },
                  {
                    $arrayToObject: {
                      $map: {
                        input: { $range: [1, 11] },
                        as: 'grade',
                        in: {
                          k: { $toString: '$$grade' },
                          v: {
                            $size: {
                              $filter: {
                                input: '$$flatGrades',
                                as: 'g',
                                cond: { $eq: ['$$g', '$$grade'] }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $sort: { artist: 1, album: 1 }
      },
      { $limit: 10000 }
    ]).toArray();

    // ✅ LOG THE SEARCH
    await logSearch(db, searchTerm, results.length, itemType || 'Total');

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        searchTerm: searchTerm,
        itemType: itemType || 'Total',
        availableItemTypes: filteredItemTypes,
        count: 0,
        data: []
      });
    }

    return NextResponse.json({
      success: true,
      searchTerm: searchTerm,
      itemType: itemType || 'Total',
      availableItemTypes: filteredItemTypes,
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