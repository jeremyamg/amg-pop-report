'use client';
import { useEffect, useState } from 'react';

interface Analytics {
  summary: {
    today: number;
    thisWeek: number;
    allTime: number;
  };
  topSearches: Array<{
    _id: string;
    count: number;
    avgResults: number;
    lastSearched: string;
  }>;
  zeroResults: Array<{
    _id: string;
    count: number;
    lastSearched: string;
  }>;
  recentSearches: Array<{
    _id: string;
    searchTerm: string;
    resultCount: number;
    timestamp: string;
  }>;
  dailySearches: Array<{
    _id: { year: number; month: number; day: number };
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>Loading analytics...</div>
  );

  if (!data) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>No data found</div>
  );

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Pop Report Analytics</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>Internal use only</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{data.summary.today}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Searches Today</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{data.summary.thisWeek}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Searches This Week</div>
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{data.summary.allTime}</div>
          <div style={{ color: '#666', marginTop: '8px' }}>Total Searches</div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Daily Searches (Last 30 Days)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Searches</th>
            </tr>
          </thead>
          <tbody>
            {(data.dailySearches ?? []).map((item, i) => {
              const date = new Date(item._id.year, item._id.month - 1, item._id.day);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{item.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Top Searches</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Search Term</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Count</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Avg Results</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Last Searched</th>
            </tr>
          </thead>
          <tbody>
            {data.topSearches.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item._id}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.count}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{Math.round(item.avgResults)}</td>
                <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                  {new Date(item.lastSearched).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Searches With No Results</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          Things people searched for but we had no data - useful for knowing what to add!
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Search Term</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Count</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Last Searched</th>
            </tr>
          </thead>
          <tbody>
            {data.zeroResults.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '12px', color: '#666', textAlign: 'center' }}>
                  No zero-result searches yet
                </td>
              </tr>
            ) : (
              data.zeroResults.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{item._id}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{item.count}</td>
                  <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                    {new Date(item.lastSearched).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Recent Searches</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Search Term</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Results</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {data.recentSearches.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item.searchTerm}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.resultCount}</td>
                <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                  {new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
