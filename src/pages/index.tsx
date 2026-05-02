import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const sections = [
  {
    title: 'Principi',
    description:
      'Le idee che precedono le regole: Unix, SOLID, scrittura difficile e lettura facile. La filosofia di fondo da cui derivano le scelte tecniche.',
    to: '/docs/regole/principi',
  },
  {
    title: 'Dominio e architettura',
    description:
      'Modellazione del dominio applicativo, struttura delle solution, separazione di responsabilità e vincoli architetturali.',
    to: '/docs/regole/dominio',
  },
  {
    title: 'Testing',
    description:
      'Test unitari e di integrazione, generazione assistita dall\'IA, monitoraggio della copertura, database usa e getta.',
    to: '/docs/regole/testing',
  },
  {
    title: 'Git e versionamento',
    description:
      'Convenzioni di commit e branch, Semantic Versioning, ciclo di rilascio tracciabile, niente pride versioning.',
    to: '/docs/regole/git',
  },
  {
    title: 'Processi',
    description:
      'Come si lavora: dall\'analisi tecnica allo sviluppo, dalla pipeline CI/CD al ciclo di rilascio.',
    to: '/docs/processi/analisi-tecnica',
  },
  {
    title: 'Tecnologie',
    description:
      'Convenzioni specifiche per stack: C# con Entity Framework e ASP.NET Core, Angular per il frontend.',
    to: '/docs/tecnologie/',
  },
  {
    title: 'Glossario e indice',
    description:
      'Termini tecnici e di dominio in un linguaggio condiviso. Indice analitico come punto di partenza per cercare concetti.',
    to: '/docs/glossario',
  },
  {
    title: 'Uso con IA',
    description:
      'Integrare questa guida in un progetto reale come knowledge base per agenti IA: sottomodulo git, riferimenti puntuali, glossario condiviso.',
    to: '/docs/uso-con-ia',
  },
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title}>
      <main>
        <div className={styles.heroBanner}>
          <div className="container">
            <Heading as="h1">{siteConfig.title}</Heading>
            <p className={styles.subtitle}>
              Una posizione sullo sviluppo software. Regole, principi e processi
              per scrivere codice che si lascia leggere, modificare e mantenere
              nel tempo.
            </p>
            <p className={styles.subtitle}>
              Non verità universali: una prospettiva argomentata, più o meno
              condivisibile, indipendente da chi la legge.
            </p>
            <div className={styles.cta}>
              <Link className="button button--primary button--lg" to="/docs/">
                Vai alla documentazione
              </Link>
            </div>
          </div>
        </div>

        <div className="container">
          <div className={styles.sections}>
            {sections.map(({title, description, to}) => (
              <Link key={title} to={to} className={styles.card}>
                <Heading as="h2">{title}</Heading>
                <p>{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
