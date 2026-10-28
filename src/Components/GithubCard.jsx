import { useEffect, useState } from 'react'
import './GithubCard.css'

const API_URL = 'https://api.github.com/users?per_page=30'

function GithubCard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchUser() {
      try {
        const response = await fetch(API_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`)
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('GitHub API returned an unexpected response.')
        }

        const initialUsers = data.slice(0, 30).map((user) => ({ ...user, profileLoading: true }))
        setUsers(initialUsers)
        setLoading(false)

        let nextUserIndex = 0

        async function loadProfileDetails() {
          while (nextUserIndex < initialUsers.length && !controller.signal.aborted) {
            const user = initialUsers[nextUserIndex]
            nextUserIndex += 1

            try {
              const profileResponse = await fetch(user.url, { signal: controller.signal })
              if (!profileResponse.ok) {
                throw new Error(`GitHub API returned ${profileResponse.status}`)
              }

              const profile = await profileResponse.json()
              setUsers((currentUsers) => currentUsers.map((currentUser) => (
                currentUser.id === user.id
                  ? { ...currentUser, ...profile, profileLoading: false }
                  : currentUser
              )))
            } catch (profileError) {
              if (profileError.name === 'AbortError') return

              setUsers((currentUsers) => currentUsers.map((currentUser) => (
                currentUser.id === user.id
                  ? { ...currentUser, profileLoading: false }
                  : currentUser
              )))
            }
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(4, initialUsers.length) }, () => loadProfileDetails()),
        )
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Could not load GitHub users.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchUser()
    return () => controller.abort()
  }, [retryCount])

  function retryLoading() {
    setError('')
    setLoading(true)
    setRetryCount((count) => count + 1)
  }

  if (loading) {
    return (
      <div className="users-page">
        <header className="users-header">
          <a className="users-brand" href="https://github.com" aria-label="GitHub home">GH <span>GitHub users</span></a>
        </header>
        <main className="users-main" aria-live="polite">
          <p className="users-loading">Loading 30 users from GitHub...</p>
        </main>
      </div>
    )
  }

  if (error || users.length === 0) {
    return (
      <div className="users-page">
        <header className="users-header">
          <a className="users-brand" href="https://github.com" aria-label="GitHub home">GH <span>GitHub users</span></a>
        </header>
        <main className="users-main users-error" role="alert">
          <h1>Users unavailable</h1>
          <p>{error || 'GitHub did not return any users.'}</p>
          <button className="users-retry" onClick={retryLoading} type="button">Try again</button>
        </main>
      </div>
    )
  }

  return (
    <div className="users-page">
      <header className="users-header">
        <a className="users-brand" href="https://github.com" aria-label="GitHub home">
          GH <span>GitHub users</span>
        </a>
        <a className="users-source" href={API_URL} target="_blank" rel="noreferrer">API source ↗</a>
      </header>

      <main className="users-main">
        <section className="users-heading" aria-labelledby="users-title">
          <div>
            <p className="users-eyebrow">PUBLIC DIRECTORY</p>
            <h1 id="users-title">GitHub users</h1>
            <p className="users-subtitle">User details loaded from the GitHub API.</p>
          </div>
          <span className="users-count">{users.length} USERS</span>
        </section>

        <section className="user-grid" aria-label="GitHub user cards">
          {users.map((user) => (
            <article className="user-card" key={user.id}>
              <img className="user-avatar" src={user.avatar_url} alt={`${user.login}'s profile`} loading="lazy" />
              <div className="user-info">
                <div className="user-identity">
                  <h2 title={user.login}>{user.login}</h2>
                </div>
                <p className="user-bio">
                  {user.profileLoading ? 'Loading profile...' : user.bio || 'No bio available.'}
                </p>
              </div>
              <div className="user-card-footer">
                <div className="user-stats">
                  <span className="user-stat">
                    <strong>{user.profileLoading ? '...' : formatCount(user.followers)}</strong>
                    <span>followers</span>
                  </span>
                  <span className="user-stat">
                    <strong>{user.profileLoading ? '...' : formatCount(user.public_repos)}</strong>
                    <span>repos</span>
                  </span>
                </div>
                <a className="user-follow" href={user.html_url} target="_blank" rel="noreferrer">
                  Follow
                </a>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}

function formatCount(value) {
  if (typeof value !== 'number') return '--'

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export default GithubCard