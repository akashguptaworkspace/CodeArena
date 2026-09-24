import { DSA_COMPANIES } from "@/features/dsa/data/companies";
import { ShareButtons } from "@/features/share/components/ShareButtons";
import styles from "./DsaHero.module.css";

// Landing-page header for DSA 200: this is the page people share, so it sells the module.
export function DsaHero({ shareUrl, shareText }) {
  return (
    <header className={styles.hero}>
      <div className={styles.top}>
        <h1 className={styles.title}>Crack the DSA round.</h1>
        <ShareButtons url={shareUrl} title="DSA 200" text={shareText} />
      </div>
      <p className={styles.lede}>
        Stop solving random problems. These 200 are grouped into 17 patterns and ordered the way you should learn
        them, so every problem makes the next one easier. Built for developers aiming at product companies.
      </p>

      <div className={styles.companies}>
        <p className={styles.companiesLabel}>Patterns commonly asked in coding rounds at</p>
        <ul className={styles.companyList}>
          {DSA_COMPANIES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </header>
  );
}
