import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', flag: '🇮🇳' }
  ];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangDropdown(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          SkillConnect
        </Link>
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <Link to={user.role === 'worker' ? '/worker/dashboard' : '/employer/dashboard'} className="navbar-item">
                Dashboard
              </Link>
              {user.role === 'employer' && (
                <Link to="/browse-workers" className="navbar-item">
                  Browse Workers
                </Link>
              )}
              <button onClick={handleLogout} className="navbar-button">
                Logout ({user.name})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-item">
                Login
              </Link>
              <Link to="/register" className="navbar-button">
                Get Started
              </Link>
            </>
          )}
          <div className="language-selector">
            <button
              className="lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              aria-label={t('navbar.language')}
            >
              🌐 {languages.find(l => l.code === i18n.language.split('-')[0])?.name || 'English'}
            </button>
            {showLangDropdown && (
              <div className="lang-dropdown">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className="lang-flag">{lang.flag}</span>
                    <span className="lang-name">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
