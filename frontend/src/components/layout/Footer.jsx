import { Link } from "react-router-dom";

const fallbackSections = [
  { title: "Quick links", links: [{ label: "Home", url: "/" }, { label: "Services", url: "/services" }, { label: "Track Application", url: "/track" }, { label: "About Us", url: "/about" }, { label: "FAQs", url: "/faq" }] },
  { title: "Resources", links: [{ label: "Blogs", url: "/blogs" }, { label: "Contact", url: "/contact" }, { label: "Refund policy", url: "/refund-policy" }] },
];

const FooterLink = ({ link }) => link.isExternal || /^https?:\/\//i.test(link.url)
  ? <a href={link.url} target="_blank" rel="noreferrer" className="hover:text-white">{link.label}</a>
  : <Link to={link.url} className="hover:text-white">{link.label}</Link>;

const Footer = ({ settings = {} }) => {
  const contact = settings.contact || {};
  const footer = settings.footer || {};
  const configured = (settings.footerSections || [])
    .filter((section) => section.isActive !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((section) => ({ ...section, links: section.links.filter((link) => link.isActive !== false).sort((a, b) => a.displayOrder - b.displayOrder) }));
  const sections = configured.length ? configured : fallbackSections;

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            {settings.logo?.url ? <img src={settings.logo.url} alt={settings.logo.altText || settings.siteName} className="h-10 max-w-36 object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">K</div>}
            <p className="text-xl font-bold text-white">{settings.shortSiteName || settings.siteName || "Karlo"}</p>
          </div>
          <p className="mt-4 leading-7 text-slate-400">{footer.shortDescription || settings.tagline || "Your trusted platform for government, financial and digital services."}</p>
          {footer.supportText && <p className="mt-3 text-sm text-slate-500">{footer.supportText}</p>}
        </div>
        {sections.slice(0, 2).map((section) => <div key={section.title}><h3 className="font-bold text-white">{section.title}</h3><div className="mt-4 flex flex-col gap-3">{section.links.map((link) => <FooterLink key={`${link.label}-${link.url}`} link={link} />)}</div></div>)}
        <div>
          <h3 className="font-bold text-white">Contact</h3>
          <div className="mt-4 space-y-3 text-slate-400">
            {(contact.supportEmail || contact.email) && <a className="block hover:text-white" href={`mailto:${contact.supportEmail || contact.email}`}>{contact.supportEmail || contact.email}</a>}
            {contact.phone && <a className="block hover:text-white" href={`tel:${contact.phone}`}>{contact.phone}</a>}
            {contact.workingHours && <p>{contact.workingHours}</p>}
            {contact.address && <p>{contact.address}</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {footer.copyrightText || "Karlo Services. All rights reserved."}
      </div>
    </footer>
  );
};

export default Footer;
