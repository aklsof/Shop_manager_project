'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang } from '@/lib/i18n';

export default function PrivacyPage() {
  const { t } = useLang();

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', minHeight: '60vh' }}>
        <h1>{t('privacy')}</h1>
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <section style={{ marginTop: '2rem' }}>
          <h2>1. Introduction</h2>
          <p>Your privacy is important to us. This Privacy Policy details how we collect, use, and share your personal information. This notice is specifically tailored to comply with legal frameworks such as the GDPR (EU), CCPA/CPRA (US), PIPEDA (Canada), and Law No. 18-07 (Algeria).</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of data:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, Email Address, Username, Shipping/Billing Address.</li>
            <li><strong>Technical Data:</strong> Cookies, IP address, device type, and browser preferences.</li>
          </ul>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>3. How We Use Your Information</h2>
          <p>We use your data strictly to provide our services, process your orders, improve the user experience, and ensure compliance with the law.</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>4. Data Rights by Region</h2>
          <ul>
            <li><strong>GDPR (Europe):</strong> You have the right to access, rectify, or erase your personal data (Right to be Forgotten). You can withdraw consent at any time.</li>
            <li><strong>CCPA (USA - California):</strong> You have the right to know what data we collect, to request deletion, and to opt-out of the sale of your personal data ("Do Not Sell My Info").</li>
            <li><strong>PIPEDA (Canada):</strong> We collect the absolute minimum data required for commerce and will always clearly identify the purpose. Your consent is required.</li>
            <li><strong>Law No. 18-07 (Algeria):</strong> We respect local data minimization, ensuring proper security protocols to protect your personal identity. Data transfers follow the national data protection authority guidelines.</li>
          </ul>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>5. Cookies Tracking</h2>
          <p>We use functional and analytical cookies to improve website performance. You can manage your cookie preferences through your browser settings or via our Cookie Consent banner.</p>
        </section>

      </div>
      <Footer />
    </>
  );
}
