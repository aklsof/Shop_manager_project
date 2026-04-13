'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLang } from '@/lib/i18n';

export default function TermsPage() {
  const { t } = useLang();

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', minHeight: '60vh' }}>
        <h1>{t('terms')}</h1>
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <section style={{ marginTop: '2rem' }}>
          <h2>1. Introduction</h2>
          <p>Welcome to our platform. These Terms of Service ("Terms") govern your use of our website and services. By accessing or using our services, you agree to be bound by these Terms.</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>2. Regulatory Compliance</h2>
          <p>This website is designed to comply with local and international laws, including but not limited to:</p>
          <ul>
            <li><strong>European Union (GDPR):</strong> We respect your data rights and provide transparency regarding data handling.</li>
            <li><strong>United States (CCPA/CPRA):</strong> We do not sell your personal data. California residents have specific rights regarding their personal information.</li>
            <li><strong>Canada (PIPEDA & CASL):</strong> We manage your personal information securely and require explicit consent for commercial communications.</li>
            <li><strong>Algeria (Law No. 18-07):</strong> We protect individuals in the processing of personal data in accordance with local Algerian regulations.</li>
          </ul>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>3. Accounts and Registration</h2>
          <p>Users must provide accurate information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>4. Use of the Services</h2>
          <p>You agree to use our services only for lawful purposes. You shall not misuse our platform, engage in fraudulent activities, or violate any applicable laws.</p>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2>5. Modifications</h2>
          <p>We reserve the right to modify these Terms at any time. We will notify users of significant changes.</p>
        </section>

      </div>
      <Footer />
    </>
  );
}
