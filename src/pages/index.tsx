import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {version} from '@site/package.json';

const CATEGORIES = [
  {
    idx: '01',
    title: 'Principi',
    path: '/docs/regole/principi',
    desc: 'Le idee che precedono le regole: Unix, SOLID, scrittura difficile e lettura facile. La filosofia di fondo da cui derivano le scelte tecniche.',
  },
  {
    idx: '02',
    title: 'Dominio e architettura',
    path: '/docs/regole/dominio',
    desc: 'Modellazione del dominio applicativo, struttura delle solution, separazione di responsabilità e vincoli architetturali.',
  },
  {
    idx: '03',
    title: 'Testing',
    path: '/docs/regole/testing',
    desc: "Test unitari e di integrazione, generazione assistita dall'IA, monitoraggio della copertura, database usa e getta.",
  },
  {
    idx: '04',
    title: 'Git e versionamento',
    path: '/docs/tecnologie/git',
    desc: 'Convenzioni di commit e branch, Semantic Versioning, ciclo di rilascio tracciabile, niente pride versioning.',
  },
  {
    idx: '05',
    title: 'Processi',
    path: '/docs/processi/analisi-tecnica',
    desc: "Come si lavora: dall'analisi tecnica allo sviluppo, dalla pipeline CI/CD al ciclo di rilascio.",
  },
  {
    idx: '06',
    title: 'Tecnologie',
    path: '/docs/tecnologie/',
    desc: 'Convenzioni specifiche per stack: C# con Entity Framework e ASP.NET Core, Angular per il frontend.',
  },
  {
    idx: '07',
    title: 'Glossario e indice',
    path: '/docs/glossario',
    desc: 'Termini tecnici e di dominio in un linguaggio condiviso. Indice analitico come punto di partenza per cercare concetti.',
  },
  {
    idx: '08',
    title: 'Uso con IA',
    path: '/docs/uso-con-ia',
    desc: 'Integrare questa guida in un progetto reale come knowledge base per agenti IA: sottomodulo git, riferimenti puntuali, glossario condiviso.',
  },
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="MyDocs — raccolta di regole, principi e processi per lo sviluppo software.">
      <main className="mydocs-home">
        <section className="mydocs-hero">
          <div className="mydocs-hero-meta">
            <span className="mydocs-pill">Docs</span>
            <span>v{version}</span>
            <span>·</span>
            <span>CC BY-SA 4.0</span>
          </div>

          <h1 className="mydocs-hero-title">
            MyDocs<span className="mydocs-cursor" aria-hidden="true" />
          </h1>

          <p className="mydocs-hero-sub">
            Una posizione sullo sviluppo software.{' '}
            <strong>Regole, principi e processi</strong> per scrivere codice che
            si lascia leggere, modificare e mantenere nel tempo.
          </p>
          <p className="mydocs-hero-sub mydocs-dim">
            // Non verità universali: una prospettiva argomentata, più o meno
            condivisibile, indipendente da chi la legge.
          </p>

          <div className="mydocs-hero-cta">
            <Link className="button button--primary" to="/docs/">
              Vai alla documentazione →
            </Link>
            <Link
              className="button"
              href="https://github.com/cagianx/my-docs">
              GitHub ↗
            </Link>
          </div>
        </section>

        <section className="mydocs-section">
          <div className="mydocs-section-head">
            <div>
              <div className="mydocs-section-lbl">// index</div>
              <h2 className="mydocs-section-title">Argomenti</h2>
            </div>
            <div className="mydocs-section-right">
              {CATEGORIES.length} sezioni
            </div>
          </div>

          <div className="mydocs-grid">
            {CATEGORIES.map((c) => (
              <Link to={c.path} key={c.idx} className="mydocs-card">
                <div className="mydocs-card-top">
                  <span className="mydocs-card-idx">{c.idx} /</span>
                  <span className="mydocs-card-arrow">→</span>
                </div>
                <div className="mydocs-card-title">{c.title}</div>
                <div className="mydocs-card-desc">{c.desc}</div>
                <div className="mydocs-card-path">{c.path}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
