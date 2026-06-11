import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import TechIcon, {type TechName} from '@site/src/components/TechIcon';
import styles from './styles.module.css';

export interface StackItem {
  /** Nome logico per il logo (vedi TechIcon). */
  icon: TechName;
  /** Etichetta visibile. */
  label: string;
  /** Pagina di destinazione. */
  href: string;
  /** Riga di contesto sotto l'etichetta. */
  note?: string;
}

export interface StackGridProps {
  items: StackItem[];
}

/** Griglia di tecnologie con logo, usata come hub visivo. */
export default function StackGrid({items}: StackGridProps): ReactNode {
  return (
    <div className={styles.grid}>
      {items.map((it) => (
        <Link key={it.href} to={it.href} className={styles.card}>
          <span className={styles.icon}>
            <TechIcon name={it.icon} size={34} />
          </span>
          <span className={styles.body}>
            <span className={styles.label}>{it.label}</span>
            {it.note && <span className={styles.note}>{it.note}</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}
