'use client';

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import styles from '@/app/PopReport.module.css';

interface GradeDistribution {
  [key: string]: number;
}

interface Variation {
  type: string;
  total: number;
  gradeDistribution: GradeDistribution;
}

interface MediaType {
  type: string;
  total: number;
  gradeDistribution: GradeDistribution;
  variations: Variation[];
}

interface SearchResult {
  artist: string;
  album: string;
  totalItems: number;
  gradeDistribution: GradeDistribution;
  mediaTypes: MediaType[];
}

interface SearchResponse {
  success: boolean;
  searchTerm: string;
  itemType: string;
  availableItemTypes: string[];
  count: number;
  data: SearchResult[];
  error?: string;
}

/**
 * The Population Report search UI.
 *
 * `embed` strips everything that only makes sense on the full page (hero, search
 * box, info cards) so the results table can be dropped into an iframe on the blog.
 */
export default function PopReportView({ embed = false }: { embed?: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [currentItemType, setCurrentItemType] = useState('Total');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [availableItemTypes, setAvailableItemTypes] = useState<string[]>([]);
  const [itemTypeCounts, setItemTypeCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [expandedMedia, setExpandedMedia] = useState<Set<string>>(new Set());

  // Autocomplete suggestions (the embed has no search box, so skip the fetch)
  useEffect(() => {
    if (embed) return;

    const loadSuggestions = async () => {
      try {
        const [artistsRes, albumsRes] = await Promise.all([
          fetch('/api/artists'),
          fetch('/api/albums')
        ]);

        const artists = await artistsRes.json();
        const albums = await albumsRes.json();

        if (artists.success && albums.success) {
          const combined = Array.from(new Set([...artists.data, ...albums.data])).sort();
          setAllSuggestions(combined);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    loadSuggestions();
  }, [embed]);

  const getItemTypeCounts = async (term: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      const result = await response.json();

      if (!result.success || result.data.length === 0) {
        return {};
      }

      const totalItems = result.data.reduce((sum: number, item: SearchResult) => sum + (item.totalItems || 0), 0);
      const counts: { [key: string]: number } = { '_total': totalItems };

      for (const type of result.availableItemTypes) {
        const typeResponse = await fetch(`/api/search?q=${encodeURIComponent(term)}&itemType=${encodeURIComponent(type)}`);
        const typeResult = await typeResponse.json();

        if (typeResult.success) {
          const typeTotal = typeResult.data.reduce((sum: number, item: SearchResult) => sum + (item.totalItems || 0), 0);
          counts[type] = typeTotal;
        }
      }

      return counts;
    } catch (error) {
      console.error('Error getting counts:', error);
      return {};
    }
  };

  // Keep the URL in sync with the current search so results can be linked to or
  // embedded. Pointless inside an iframe, where nobody sees the address bar.
  const updateUrl = (term: string, itemType: string) => {
    if (embed) return;

    const params = new URLSearchParams();
    if (term) params.set('q', term);
    if (itemType && itemType !== 'Total') params.set('type', itemType);
    const query = params.toString();
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
  };

  const runSearch = async (term: string, itemType: string = 'Total') => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setCurrentSearchTerm(trimmed);
    setCurrentItemType(itemType);
    setShowResults(true);
    setLoading(true);
    setExpandedAlbums(new Set());
    setExpandedMedia(new Set());

    try {
      const url = itemType === 'Total'
        ? `/api/search?q=${encodeURIComponent(trimmed)}`
        : `/api/search?q=${encodeURIComponent(trimmed)}&itemType=${encodeURIComponent(itemType)}`;

      const response = await fetch(url);
      const result: SearchResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Search failed');
      }

      if (result.success) {
        setResults(result.data);
        setResultCount(result.count);
        setAvailableItemTypes(result.availableItemTypes || []);
        const counts = await getItemTypeCounts(trimmed);
        setItemTypeCounts(counts);
      } else {
        setResults([]);
        setResultCount(0);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Run the search straight away when the page is opened with ?q= (deep links, blog embeds).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;

    setSearchTerm(q);
    runSearch(q, params.get('type') || 'Total');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!searchTerm.trim()) {
      alert('Please enter an artist or album name');
      return;
    }

    updateUrl(searchTerm.trim(), 'Total');
    await runSearch(searchTerm, 'Total');
  };

  const filterByItemType = async (itemType: string) => {
    if (!currentSearchTerm) return;

    setCurrentItemType(itemType);
    updateUrl(currentSearchTerm, itemType);
    setLoading(true);

    try {
      const url = itemType === 'Total'
        ? `/api/search?q=${encodeURIComponent(currentSearchTerm)}`
        : `/api/search?q=${encodeURIComponent(currentSearchTerm)}&itemType=${encodeURIComponent(itemType)}`;

      const response = await fetch(url);
      const result: SearchResponse = await response.json();

      if (result.success) {
        setResults(result.data);
        setResultCount(result.count);
      }
    } catch (error) {
      console.error('Filter error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAlbum = (index: number) => {
    const newExpanded = new Set(expandedAlbums);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
      const mediaToRemove = Array.from(expandedMedia).filter(key => key.startsWith(`${index}-`));
      mediaToRemove.forEach(key => expandedMedia.delete(key));
    } else {
      newExpanded.add(index);
    }
    setExpandedAlbums(newExpanded);
  };

  const toggleMedia = (mediaKey: string) => {
    const newExpanded = new Set(expandedMedia);
    if (newExpanded.has(mediaKey)) {
      newExpanded.delete(mediaKey);
    } else {
      newExpanded.add(mediaKey);
    }
    setExpandedMedia(newExpanded);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    setShowResults(false);
    setResults([]);
    setExpandedAlbums(new Set());
    setExpandedMedia(new Set());
    updateUrl('', 'Total');
  };

  const fullReportUrl = currentSearchTerm
    ? `/?q=${encodeURIComponent(currentSearchTerm)}${currentItemType !== 'Total' ? `&type=${encodeURIComponent(currentItemType)}` : ''}`
    : '/';

  return (
    <div className={`${styles.popReportPage} ${embed ? styles.embedPage : ''}`}>
      {!embed && (
        <section className={styles.heroSection}>
          <h1 className={styles.heroTitle}>AMG Population Report</h1>
          <p className={styles.heroDescription}>
            Use AMG&apos;s Population Report search to determine the number of vinyl, cassettes, CDs and 8-tracks that AMG has graded for each artist and album in our database.
          </p>
        </section>
      )}

      {!embed && (
        <div className={styles.searchContainer}>
          <form onSubmit={performSearch} className={styles.searchBox}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              placeholder="Try: Taylor Swift, 1989, Beatles..."
              list="searchSuggestions"
            />
            <datalist id="searchSuggestions">
              {allSuggestions.map((suggestion, i) => (
                <option key={i} value={suggestion} />
              ))}
            </datalist>
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className={styles.clearBtn}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button type="submit" className={styles.searchButton} disabled={loading}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 22L20 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {!embed && !showResults && (
        <section className={styles.infoSection}>
          <div className={styles.infoCard}>
            <Image src="/images/popreport/magnifying.png" alt="Search" className={styles.infoIcon} width={106} height={106} />
            <p className={styles.infoText}>
              Search AMG&apos;s Population Report either by a specific artist or a specific album.
            </p>
          </div>
          <div className={styles.infoCard}>
            <Image src="/images/popreport/microscope.png" alt="Analysis" className={styles.infoIcon} width={106} height={106} />
            <p className={styles.infoText}>
              Get an exact count of each item graded from Authentic to 1-10. You can also see Population Counts broken out by Sealed, Open, and Signature Series.
            </p>
          </div>
          <div className={styles.infoCard}>
            <Image src="/images/popreport/calendar.png" alt="Updates" className={styles.infoIcon} width={106} height={106} />
            <p className={styles.infoText}>
              Data is updated each day as more and more items are submitted to AMG.
            </p>
          </div>
        </section>
      )}

      {/* Embed loaded without a ?q= - nothing to show, so point at the real thing */}
      {embed && !showResults && (
        <div className={styles.embedEmpty}>
          <p>
            No search specified.{' '}
            <a href="/" target="_blank" rel="noopener noreferrer">
              Search the AMG Population Report →
            </a>
          </p>
        </div>
      )}

      {showResults && (
        <section className={styles.resultsSection}>
          <div className={styles.resultHeader}>
            <h2 className={embed ? styles.embedTitle : styles.resultTitle}>
              {embed ? `AMG Population Report: ${currentSearchTerm}` : `Results for "${currentSearchTerm}"`}
              {currentItemType !== 'Total' && ` (${currentItemType})`}
            </h2>
            <p className={styles.resultCount}>
              Showing <strong>{resultCount}</strong> result{resultCount !== 1 ? 's' : ''}
            </p>
          </div>

          {availableItemTypes.length > 0 && (
            <div className={styles.filterToggle}>
              <button
                className={`${styles.filterBtn} ${styles.total} ${currentItemType === 'Total' ? styles.active : ''}`}
                onClick={() => filterByItemType('Total')}
              >
                Total {itemTypeCounts['_total'] > 0 && <span className={styles.count}>({itemTypeCounts['_total']})</span>}
              </button>
              {availableItemTypes.map((type) => {
                if (!type || type === 'Unknown') return null;

                let className = type.toLowerCase().replace(/\s+/g, '-');
                if (type === 'Signature Series') {
                  className = 'signature';
                }

                const displayText = type === 'Signature Series' ? 'Signature' : type;
                const count = itemTypeCounts[type] || 0;

                return (
                  <button
                    key={type}
                    className={`${styles.filterBtn} ${styles[className] || ''} ${currentItemType === type ? styles.active : ''}`}
                    onClick={() => filterByItemType(type)}
                  >
                    {displayText} {count > 0 && <span className={styles.count}>({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className={styles.loading}>Searching...</div>
          ) : results.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No results found</h3>
              <p>Try a different search term</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.resultsTable}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>ARTIST / ALBUM</th>
                    <th style={{ textAlign: 'center' }}>AUTHENTIC</th>
                    <th style={{ textAlign: 'center' }}>AMG 1</th>
                    <th style={{ textAlign: 'center' }}>AMG 2</th>
                    <th style={{ textAlign: 'center' }}>AMG 3</th>
                    <th style={{ textAlign: 'center' }}>AMG 4</th>
                    <th style={{ textAlign: 'center' }}>AMG 5</th>
                    <th style={{ textAlign: 'center' }}>AMG 6</th>
                    <th style={{ textAlign: 'center' }}>AMG 7</th>
                    <th style={{ textAlign: 'center' }}>AMG 8</th>
                    <th style={{ textAlign: 'center' }}>AMG 9</th>
                    <th style={{ textAlign: 'center' }}>AMG 10</th>
                    <th style={{ textAlign: 'center' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => {
                    const grades = item.gradeDistribution;
                    const isExpanded = expandedAlbums.has(index);

                    return (
                      <React.Fragment key={index}>
                        <tr
                          className={`${styles.albumRow} ${isExpanded ? styles.expanded : ''}`}
                          onClick={() => toggleAlbum(index)}
                        >
                          <td>
                            <div className={styles.albumName}>
                              <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>▶</span>
                              <strong>{item.artist} - {item.album}</strong>
                            </div>
                          </td>
                          <td className={`${styles.gradeCell} ${grades['AUTHENTIC'] > 0 ? styles.hasCount : ''}`}>
                            {grades['AUTHENTIC'] || '-'}
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                            <td key={grade} className={`${styles.gradeCell} ${grades[grade] > 0 ? styles.hasCount : ''}`}>
                              {grades[grade] || '-'}
                            </td>
                          ))}
                          <td className={styles.totalCell}>{item.totalItems}</td>
                        </tr>

                        {isExpanded && item.mediaTypes?.map((media, mediaIndex) => {
                          const mediaKey = `${index}-${mediaIndex}`;
                          const isMediaExpanded = expandedMedia.has(mediaKey);

                          return (
                            <React.Fragment key={mediaKey}>
                              <tr
                                className={`${styles.detailRow} ${styles.mediaRow} ${isMediaExpanded ? styles.expanded : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (media.variations && media.variations.filter(v => v.type && v.type.trim() !== '').length > 0) {
                                    toggleMedia(mediaKey);
                                  }
                                }}
                                style={{
                                  cursor: media.variations && media.variations.filter(v => v.type && v.type.trim() !== '').length > 0 ? 'pointer' : 'default'
                                }}
                              >
                                <td>
                                  <div className={styles.mediaTypeLabel}>
                                    {media.variations && media.variations.filter(v => v.type && v.type.trim() !== '').length > 0 && (
                                      <span className={`${styles.expandIcon} ${isMediaExpanded ? styles.expanded : ''}`}>▶</span>
                                    )}
                                    <span>{media.type}</span>
                                  </div>
                                </td>
                                <td className={`${styles.gradeCell} ${media.gradeDistribution['AUTHENTIC'] > 0 ? styles.hasCount : ''}`}>
                                  {media.gradeDistribution['AUTHENTIC'] || '-'}
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                                  <td key={grade} className={`${styles.gradeCell} ${media.gradeDistribution[grade] > 0 ? styles.hasCount : ''}`}>
                                    {media.gradeDistribution[grade] || '-'}
                                  </td>
                                ))}
                                <td className={styles.totalCell}>{media.total}</td>
                              </tr>

                              {isMediaExpanded && media.variations?.map((variation, varIndex) => {
                                if (!variation.type || variation.type.trim() === '') return null;

                                return (
                                  <tr key={`${mediaKey}-${varIndex}`} className={`${styles.detailRow} ${styles.variationRow}`}>
                                    <td>
                                      <div className={styles.variationTypeLabel}>
                                        {variation.type}
                                      </div>
                                    </td>
                                    <td className={`${styles.gradeCell} ${variation.gradeDistribution['AUTHENTIC'] > 0 ? styles.hasCount : ''}`}>
                                      {variation.gradeDistribution['AUTHENTIC'] || '-'}
                                    </td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                                      <td key={grade} className={`${styles.gradeCell} ${variation.gradeDistribution[grade] > 0 ? styles.hasCount : ''}`}>
                                        {variation.gradeDistribution[grade] || '-'}
                                      </td>
                                    ))}
                                    <td className={styles.totalCell}>{variation.total}</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Attribution / escape hatch out of the iframe */}
          {embed && (
            <p className={styles.embedFooter}>
              Population data from{' '}
              <a href={fullReportUrl} target="_blank" rel="noopener noreferrer">
                Audio Media Grading
              </a>
              . Updated daily.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
