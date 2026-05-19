import React from 'react';
import {version} from '@site/package.json';

export default function Footer(): React.ReactElement {
  return (
    <footer className="md-statusbar">
      <span className="sb-item">
        <span className="sb-dot" /> ONLINE
      </span>
      <span className="sb-item">⎇ main</span>
      <span className="sb-item">v{version}</span>
      <span className="sb-item">build ✓</span>
      <span className="sb-spacer" />
      <span className="sb-item">docusaurus 3.10</span>
      <a
        className="sb-item"
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer">
        cc by-sa 4.0
      </a>
      <span className="sb-item sb-accent">IT</span>
    </footer>
  );
}
