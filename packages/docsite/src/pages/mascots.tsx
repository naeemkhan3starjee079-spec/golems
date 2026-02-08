import Layout from '@theme/Layout';
import GolemMascot from '../components/mascots/GolemMascot';
import type {MascotVariant} from '../components/mascots/GolemMascot';
import styles from './mascots.module.css';

const variants: {name: string; variant: MascotVariant; description: string}[] = [
  {name: 'Clay Guardian', variant: 'guardian', description: 'Ancient + tech fusion, circuit-trace cracks'},
  {name: 'Prague Protector', variant: 'prague', description: 'Full folklore, synagogue silhouette'},
  {name: 'Neon Shem', variant: 'neon', description: 'Modern geometric, circuit-board minimal'},
  {name: 'Pixel Golem', variant: 'pixel', description: 'Retro 8-bit, chunky pixel art'},
  {name: 'Ink Golem', variant: 'ink', description: 'Calligraphic, formed from Hebrew strokes'},
];

export default function MascotsPage() {
  return (
    <Layout title="Golem Mascots" description="All 5 Golem mascot variants">
      <div className={styles.container}>
        <h1 className={styles.title}>Golem Mascots</h1>
        <p className={styles.subtitle}>5 distinct ASCII art variants, each with unique personality</p>

        <div className={styles.grid}>
          {variants.map((v) => (
            <div key={v.variant} className={styles.card}>
              <GolemMascot variant={v.variant} size="md" animated={false} />
              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{v.name}</h3>
                <p className={styles.cardDesc}>{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
