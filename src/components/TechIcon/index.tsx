import type {ReactNode} from 'react';
import {
  Angular,
  CSharp,
  Docker,
  Electron,
  Git,
  Microsoft,
  MicrosoftSQLServer,
  PostgreSQL,
  TypeScript,
} from 'developer-icons';

type IconComponent = (props: {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}) => ReactNode;

// Mappa nomi logici → componenti della libreria developer-icons.
// I nomi senza un'icona dedicata nella libreria (sqlite, tauri, webview2,
// kestrel) restano fuori dalla mappa: il componente non rende nulla, senza
// rompere il layout.
const ICONS: Record<string, IconComponent> = {
  csharp: CSharp,
  dotnet: Microsoft,
  angular: Angular,
  git: Git,
  postgres: PostgreSQL,
  postgresql: PostgreSQL,
  sqlserver: MicrosoftSQLServer,
  electron: Electron,
  docker: Docker,
  typescript: TypeScript,
};

export type TechName = string;

export interface TechIconProps {
  /** Nome logico della tecnologia (case-insensitive), es. "csharp", "angular". */
  name: TechName;
  /** Lato dell'icona in px. Default 24. */
  size?: number;
  className?: string;
}

/**
 * Logo di una tecnologia, dalla libreria developer-icons.
 * Restituisce `null` se la tecnologia non ha un'icona nota, così l'uso
 * è sempre sicuro anche dove un logo non esiste.
 */
export default function TechIcon({
  name,
  size = 24,
  className,
}: TechIconProps): ReactNode {
  const Icon = ICONS[name.toLowerCase()];
  if (!Icon) {
    return null;
  }
  // I loghi sono decorativi: ridondanti rispetto al testo (label o titolo)
  // accanto a cui compaiono, quindi nascosti agli screen reader.
  return <Icon size={size} className={className} aria-hidden />;
}

export interface TechIconRowProps {
  /** Elenco di nomi logici da mostrare in fila. */
  names: TechName[];
  size?: number;
  className?: string;
}

/** Fila di loghi: utile per riassumere uno stack. */
export function TechIconRow({
  names,
  size = 22,
  className,
}: TechIconRowProps): ReactNode {
  return (
    <span className={className} style={{display: 'inline-flex', gap: 10, alignItems: 'center'}}>
      {names
        .filter((n) => ICONS[n.toLowerCase()])
        .map((n) => (
          <TechIcon key={n} name={n} size={size} />
        ))}
    </span>
  );
}
