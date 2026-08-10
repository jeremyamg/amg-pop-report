import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Site chrome lives here rather than in the root layout so /embed, which renders
// inside an iframe on the blog, can opt out of it.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
