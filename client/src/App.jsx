import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import './App.css'

export default function App() {
  const [links, setLinks] = useState([])
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)

  const loadLinks = async () => {
    const res = await fetch('/api/links')
    setLinks(await res.json())
  }

  useEffect(() => {
    loadLinks()
  }, [])

  const createLink = async (e) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error)
    setUrl('')
    loadLinks()
  }

  const openStats = async (code) => {
    setSelected(code)
    const res = await fetch(`/api/links/${code}/stats`)
    setStats(await res.json())
  }

  return (
    <div className="container">
      <h1>URL Shortener</h1>

      <form onSubmit={createLink} className="create">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/link"
        />
        <button type="submit">ย่อลิงก์</button>
      </form>
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr><th>ลิงก์สั้น</th><th>ปลายทาง</th><th>คลิก</th><th></th></tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.code}>
              <td><a href={l.short_url} target="_blank" rel="noreferrer">{l.short_url}</a></td>
              <td className="dest">{l.original_url}</td>
              <td>{l.click_count}</td>
              <td><button onClick={() => openStats(l.code)}>ดูสถิติ</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {stats && (
        <div className="stats">
          <h2>สถิติ: {selected} ({stats.total_clicks} คลิก)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="clicks" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <h3>Referrer ยอดนิยม</h3>
          <ul>
            {stats.referrers.map((r) => (
              <li key={r.referrer}>{r.referrer}: {r.clicks}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}