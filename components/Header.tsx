import Link from 'next/link';
import { Upload, BarChart3, FolderOpen, Database, GitBranch, TestTube } from 'lucide-react';
import { useRouter } from 'next/router';

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => {
    if (path === '/courseharvester') {
      return currentPath === '/courseharvester';
    }
    if (path === '/masterdatabase') {
      return currentPath === '/masterdatabase';
    }
    if (path === '/map') {
      return currentPath === '/map';
    }
    if (path === '/tokens') {
      return currentPath === '/tokens';
    }
    if (path === '/extractions') {
      return currentPath === '/extractions' || currentPath.startsWith('/extraction/');
    }
    if (path === '/test-api') {
      return currentPath === '/test-api';
    }
    return false;
  };

  return (
    <>
      <style jsx global>{`
        .header a {
          text-decoration: none !important;
        }
        .header a:hover {
          text-decoration: none !important;
        }
      `}</style>

      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border-radius: 0 0 20px 20px;
        }
        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .logo-img {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .logo-text {
          font-size: 25px;
          font-weight: 800;
          color: #603AC8;
          padding: 12px;
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
          background: transparent;
        }
        .nav-link svg {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
        }
        .nav-link:hover {
          color: #4f46e5;
          background: #f3f4f6;
        }
        .nav-link.active {
          color: #4f46e5;
          background: #ede9fe;
        }
        .nav-link-text {
          white-space: nowrap;
          padding: 6px;
        }
        .get-started-btn {
          margin-left: 12px;
          padding: 8px 16px;
          background: #4f46e5;
          color: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .get-started-btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        /* Mobile styles - hide text, show only icons */
        @media (max-width: 768px) {
          .header {
            padding: 10px 16px;
          }
          .logo-text {
            display: none;
          }
          .nav-link-text {
            display: none;
          }
          .nav-link {
            padding: 8px;
            gap: 0;
          }
        }

        /* Very small screens */
        @media (max-width: 400px) {
          .header {
            padding: 8px 12px;
          }
          .logo-img {
            width: 36px;
            height: 36px;
          }
          .nav {
            gap: 10px;
          }
          .nav-link {
            padding: px;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="logo-link">
            <img 
              src="/PlanpathsIcon.png" 
              alt="Planpaths Logo" 
              className="logo-img"
            />
            <span className="logo-text">
              Planpaths Data Miner
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="nav">
            <Link 
              href="/courseharvester" 
              className={`nav-link ${isActive('/courseharvester') ? 'active' : ''}`}
              title="Course Harvester"
            >
              <Upload size={18} />
              <span className="nav-link-text">Harvester</span>
            </Link>
            <Link 
              href="/masterdatabase" 
              className={`nav-link ${isActive('/masterdatabase') ? 'active' : ''}`}
              title="Master Database"
            >
              <Database size={18} />
              <span className="nav-link-text">Master DB</span>
            </Link>
            <Link 
              href="/map" 
              className={`nav-link ${isActive('/map') ? 'active' : ''}`}
              title="Mapping"
            >
              <GitBranch size={18} />
              <span className="nav-link-text">Mapping</span>
            </Link>
            <Link 
              href="/extractions" 
              className={`nav-link ${isActive('/extractions') ? 'active' : ''}`}
              title="History"
            >
              <FolderOpen size={18} />
              <span className="nav-link-text">History</span>
            </Link>
            <Link 
              href="/tokens" 
              className={`nav-link ${isActive('/tokens') ? 'active' : ''}`}
              title="Analytics"
            >
              <BarChart3 size={18} />
              <span className="nav-link-text">Analytics</span>
            </Link>
            <Link 
              href="/test-api" 
              className={`nav-link ${isActive('/test-api') ? 'active' : ''}`}
              title="Test API"
            >
              <TestTube size={18} />
              <span className="nav-link-text">Test API</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
