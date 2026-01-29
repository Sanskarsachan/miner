import Link from 'next/link';
import { Upload, BarChart3, FolderOpen, Sparkles } from 'lucide-react';
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
    if (path === '/tokens') {
      return currentPath === '/tokens';
    }
    if (path === '/extractions') {
      return currentPath === '/extractions' || currentPath.startsWith('/extraction/');
    }
    return false;
  };

  return (
    <>
      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: ${transparent ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)'};
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #F4F0FF;
          padding: 12px 24px;
        }
        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-link {
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-img {
          width: 36px;
          height: 36px;
          border-radius: 8px;
        }
        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #31225C;
        }
        .logo-text-highlight {
          color: #603AC8;
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          color: #31225C;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .nav-link:hover {
          background: #F4F0FF;
        }
        .nav-link.active {
          background: #F4F0FF;
          color: #603AC8;
        }
        .nav-link-text {
          display: inline;
        }
        .get-started-btn {
          margin-left: 12px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #603AC8, #31225C);
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(96, 58, 200, 0.3);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .get-started-btn:hover {
          box-shadow: 0 6px 20px rgba(96, 58, 200, 0.4);
          transform: translateY(-1px);
        }
        .get-started-text {
          display: inline;
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
            padding: 10px;
          }
          .get-started-text {
            display: none;
          }
          .get-started-btn {
            margin-left: 8px;
            padding: 10px;
          }
        }

        /* Very small screens */
        @media (max-width: 400px) {
          .header {
            padding: 8px 12px;
          }
          .logo-img {
            width: 32px;
            height: 32px;
          }
          .nav {
            gap: 4px;
          }
          .nav-link {
            padding: 8px;
          }
          .get-started-btn {
            padding: 8px;
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
              Course<span className="logo-text-highlight">Harvester</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="nav">
            <Link 
              href="/courseharvester" 
              className={`nav-link ${isActive('/courseharvester') ? 'active' : ''}`}
              title="Extract"
            >
              <Upload size={18} />
              <span className="nav-link-text">Extract</span>
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
              href="/extractions" 
              className={`nav-link ${isActive('/extractions') ? 'active' : ''}`}
              title="History"
            >
              <FolderOpen size={18} />
              <span className="nav-link-text">History</span>
            </Link>
            <Link href="/courseharvester" className="get-started-btn" title="Get Started">
              <Sparkles size={16} />
              <span className="get-started-text">Get Started</span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
