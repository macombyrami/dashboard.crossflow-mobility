export default function RGPDPage() {
  return (
    <>
      <h1 className="text-3xl font-black mb-8">Conformité RGPD</h1>
      <p className="text-text-muted mb-6">Engagements de CrossFlow Mobility</p>
      
      <h2 className="text-xl font-bold text-white mb-4">Hébergement en Europe</h2>
      <p className="text-text-muted mb-6">
        Toutes nos données sont hébergées sur des serveurs situés au sein de l&apos;Union Européenne (GCP Belgique/Allemagne).
      </p>

      <h2 className="text-xl font-bold text-white mb-4">DPO</h2>
      <p className="text-text-muted mb-6">
        Nous avons nommé un délégué à la protection des données (DPO) joignable à dpo@crossflow-mobility.com.
      </p>

      <h2 className="text-xl font-bold text-white mb-4">Sécurité</h2>
      <p className="text-text-muted mb-6">
        Chiffrement AES-256 pour les données au repos et TLS 1.3 pour les données en transit.
      </p>
    </>
  );
}
