import Navbar from "../../components/layout/Navbar";
import HeroSection from "../../components/home/HeroSection";
import PopularServices from "../../components/home/PopularServices";
import Footer from "../../components/layout/Footer";

const Home = () => {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <PopularServices />
      </main>

      <Footer />
    </>
  );
};

export default Home;

// import { Link } from "react-router-dom";

// const services = [
//   {
//     id: 1,
//     icon: "🪪",
//     title: "PAN Card",
//     description: "Apply for a new PAN card or request corrections easily.",
//     price: 199,
//     processingTime: "7–15 days",
//   },
//   {
//     id: 2,
//     icon: "🛂",
//     title: "Passport Service",
//     description: "Get assistance with new passport and renewal applications.",
//     price: 499,
//     processingTime: "15–30 days",
//   },
//   {
//     id: 3,
//     icon: "📄",
//     title: "Income Certificate",
//     description: "Apply online for your income certificate with document support.",
//     price: 149,
//     processingTime: "7–10 days",
//   },
//   {
//     id: 4,
//     icon: "🏠",
//     title: "Domicile Certificate",
//     description: "Submit your domicile certificate application securely.",
//     price: 149,
//     processingTime: "7–15 days",
//   },
//   {
//     id: 5,
//     icon: "🧾",
//     title: "ITR Filing",
//     description: "File your income tax return with professional assistance.",
//     price: 599,
//     processingTime: "1–3 days",
//   },
//   {
//     id: 6,
//     icon: "🏢",
//     title: "GST Registration",
//     description: "Register your business for GST with complete guidance.",
//     price: 999,
//     processingTime: "3–7 days",
//   },
// ];

// const steps = [
//   {
//     number: "01",
//     title: "Choose a service",
//     description: "Browse available government and digital services.",
//   },
//   {
//     number: "02",
//     title: "Submit your details",
//     description: "Fill in the application form and upload required documents.",
//   },
//   {
//     number: "03",
//     title: "Track your application",
//     description: "Receive updates and track your application from your dashboard.",
//   },
// ];

// const benefits = [
//   {
//     icon: "🔒",
//     title: "Secure Documents",
//     description: "Your personal information and documents are handled securely.",
//   },
//   {
//     icon: "⚡",
//     title: "Fast Processing",
//     description: "Our streamlined process helps complete applications quickly.",
//   },
//   {
//     icon: "📱",
//     title: "Online Tracking",
//     description: "Track your service application from anywhere at any time.",
//   },
//   {
//     icon: "🎧",
//     title: "Customer Support",
//     description: "Get assistance whenever you face an application-related issue.",
//   },
// ];

// const Home = () => {
//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-900">
//       {/* Navbar */}
//       <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
//         <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
//           <Link to="/" className="flex items-center gap-2">
//             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">
//               K
//             </div>

//             <div>
//               <p className="text-xl font-bold text-blue-700">Karlo</p>
//               <p className="text-xs text-slate-500">Digital Services</p>
//             </div>
//           </Link>

//           <div className="hidden items-center gap-8 md:flex">
//             <Link
//               to="/"
//               className="font-medium text-blue-700"
//             >
//               Home
//             </Link>

//             <Link
//               to="/services"
//               className="font-medium text-slate-600 transition hover:text-blue-700"
//             >
//               Services
//             </Link>

//             <Link
//               to="/track"
//               className="font-medium text-slate-600 transition hover:text-blue-700"
//             >
//               Track Application
//             </Link>

//             <Link
//               to="/about"
//               className="font-medium text-slate-600 transition hover:text-blue-700"
//             >
//               About
//             </Link>

//             <Link
//               to="/contact"
//               className="font-medium text-slate-600 transition hover:text-blue-700"
//             >
//               Contact
//             </Link>
//           </div>

//           <div className="flex items-center gap-3">
//             <Link
//               to="/login"
//               className="hidden rounded-lg px-4 py-2 font-semibold text-blue-700 transition hover:bg-blue-50 sm:block"
//             >
//               Login
//             </Link>

//             <Link
//               to="/register"
//               className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800"
//             >
//               Register
//             </Link>
//           </div>
//         </nav>
//       </header>

//       <main>
//         {/* Hero Section */}
//         <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50">
//           <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
//             <div>
//               <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
//                 Trusted digital service platform
//               </span>

//               <h1 className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
//                 Government and digital services,
//                 <span className="text-blue-700"> made simple.</span>
//               </h1>

//               <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
//                 Apply for PAN card, passport, certificates, GST, ITR,
//                 government forms and many other services from one secure
//                 platform.
//               </p>

//               <div className="mt-8 flex flex-col gap-4 sm:flex-row">
//                 <Link
//                   to="/services"
//                   className="rounded-xl bg-blue-700 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800"
//                 >
//                   Explore Services
//                 </Link>

//                 <Link
//                   to="/track"
//                   className="rounded-xl border border-blue-700 px-6 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
//                 >
//                   Track Application
//                 </Link>
//               </div>

//               <div className="mt-10 grid max-w-lg grid-cols-3 gap-6">
//                 <div>
//                   <p className="text-2xl font-bold text-slate-900">50+</p>
//                   <p className="text-sm text-slate-500">Services</p>
//                 </div>

//                 <div>
//                   <p className="text-2xl font-bold text-slate-900">10K+</p>
//                   <p className="text-sm text-slate-500">Applications</p>
//                 </div>

//                 <div>
//                   <p className="text-2xl font-bold text-slate-900">24/7</p>
//                   <p className="text-sm text-slate-500">Tracking</p>
//                 </div>
//               </div>
//             </div>

//             <div className="relative">
//               <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-blue-200 blur-3xl" />
//               <div className="absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-orange-200 blur-3xl" />

//               <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
//                 <div className="flex items-center justify-between border-b border-slate-100 pb-5">
//                   <div>
//                     <p className="text-sm text-slate-500">Welcome back</p>
//                     <h2 className="text-xl font-bold">Customer Dashboard</h2>
//                   </div>

//                   <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100">
//                     👤
//                   </div>
//                 </div>

//                 <div className="mt-6 grid grid-cols-2 gap-4">
//                   <div className="rounded-2xl bg-blue-50 p-4">
//                     <p className="text-sm text-slate-500">Total Applications</p>
//                     <p className="mt-2 text-3xl font-bold text-blue-700">08</p>
//                   </div>

//                   <div className="rounded-2xl bg-emerald-50 p-4">
//                     <p className="text-sm text-slate-500">Completed</p>
//                     <p className="mt-2 text-3xl font-bold text-emerald-700">
//                       05
//                     </p>
//                   </div>
//                 </div>

//                 <div className="mt-6">
//                   <h3 className="font-semibold">Recent application</h3>

//                   <div className="mt-4 rounded-2xl border border-slate-200 p-4">
//                     <div className="flex items-start justify-between gap-3">
//                       <div>
//                         <p className="font-semibold">PAN Card Correction</p>
//                         <p className="mt-1 text-sm text-slate-500">
//                           Application ID: KARLO1024
//                         </p>
//                       </div>

//                       <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
//                         Processing
//                       </span>
//                     </div>

//                     <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
//                       <div className="h-full w-2/3 rounded-full bg-blue-700" />
//                     </div>

//                     <p className="mt-3 text-sm text-slate-500">
//                       Document verification is currently in progress.
//                     </p>
//                   </div>
//                 </div>

//                 <Link
//                   to="/customer/dashboard"
//                   className="mt-6 block rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
//                 >
//                   View Dashboard
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Popular Services */}
//         <section className="py-20">
//           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//             <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
//               <div>
//                 <p className="font-semibold text-blue-700">Popular services</p>
//                 <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
//                   Services you can apply for
//                 </h2>
//                 <p className="mt-3 max-w-2xl text-slate-600">
//                   Choose from our most requested government, financial and
//                   documentation services.
//                 </p>
//               </div>

//               <Link
//                 to="/services"
//                 className="font-semibold text-blue-700 hover:text-blue-800"
//               >
//                 View all services →
//               </Link>
//             </div>

//             <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
//               {services.map((service) => (
//                 <article
//                   key={service.id}
//                   className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
//                 >
//                   <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl transition group-hover:bg-blue-100">
//                     {service.icon}
//                   </div>

//                   <h3 className="mt-5 text-xl font-bold">{service.title}</h3>

//                   <p className="mt-3 leading-7 text-slate-600">
//                     {service.description}
//                   </p>

//                   <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
//                     <div>
//                       <p className="text-xs text-slate-500">Starting from</p>
//                       <p className="font-bold text-slate-900">
//                         ₹{service.price}
//                       </p>
//                     </div>

//                     <div className="text-right">
//                       <p className="text-xs text-slate-500">Processing time</p>
//                       <p className="font-semibold">{service.processingTime}</p>
//                     </div>
//                   </div>

//                   <Link
//                     to={`/services/${service.id}`}
//                     className="mt-6 block rounded-xl bg-blue-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-800"
//                   >
//                     Apply Now
//                   </Link>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* How It Works */}
//         <section className="bg-slate-900 py-20 text-white">
//           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//             <div className="text-center">
//               <p className="font-semibold text-orange-400">Simple process</p>
//               <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
//                 How Karlo works
//               </h2>
//               <p className="mx-auto mt-4 max-w-2xl text-slate-300">
//                 Complete your application in three straightforward steps.
//               </p>
//             </div>

//             <div className="mt-12 grid gap-8 md:grid-cols-3">
//               {steps.map((step) => (
//                 <div
//                   key={step.number}
//                   className="rounded-2xl border border-slate-700 bg-slate-800 p-7"
//                 >
//                   <span className="text-4xl font-bold text-blue-400">
//                     {step.number}
//                   </span>

//                   <h3 className="mt-5 text-xl font-bold">{step.title}</h3>

//                   <p className="mt-3 leading-7 text-slate-300">
//                     {step.description}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* Why Choose Us */}
//         <section className="py-20">
//           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//             <div className="text-center">
//               <p className="font-semibold text-blue-700">Why choose Karlo</p>
//               <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
//                 A reliable platform for important services
//               </h2>
//             </div>

//             <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
//               {benefits.map((benefit) => (
//                 <div
//                   key={benefit.title}
//                   className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
//                 >
//                   <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
//                     {benefit.icon}
//                   </div>

//                   <h3 className="mt-5 text-lg font-bold">{benefit.title}</h3>

//                   <p className="mt-3 text-sm leading-6 text-slate-600">
//                     {benefit.description}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* Call To Action */}
//         <section className="px-4 pb-20 sm:px-6 lg:px-8">
//           <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-blue-700 px-6 py-12 text-center text-white sm:px-12">
//             <h2 className="text-3xl font-bold sm:text-4xl">
//               Ready to apply for your service?
//             </h2>

//             <p className="mx-auto mt-4 max-w-2xl text-blue-100">
//               Create your account, upload your documents and track the complete
//               application process online.
//             </p>

//             <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
//               <Link
//                 to="/register"
//                 className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
//               >
//                 Create Account
//               </Link>

//               <Link
//                 to="/services"
//                 className="rounded-xl border border-blue-300 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
//               >
//                 Browse Services
//               </Link>
//             </div>
//           </div>
//         </section>
//       </main>

//       {/* Footer */}
//       <footer className="bg-slate-950 text-slate-300">
//         <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
//           <div>
//             <div className="flex items-center gap-2">
//               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">
//                 K
//               </div>

//               <p className="text-xl font-bold text-white">Karlo</p>
//             </div>

//             <p className="mt-4 max-w-sm leading-7 text-slate-400">
//               Your trusted platform for government, financial and digital
//               services.
//             </p>
//           </div>

//           <div>
//             <h3 className="font-bold text-white">Quick links</h3>
//             <div className="mt-4 flex flex-col gap-3">
//               <Link to="/" className="hover:text-white">
//                 Home
//               </Link>
//               <Link to="/services" className="hover:text-white">
//                 Services
//               </Link>
//               <Link to="/track" className="hover:text-white">
//                 Track Application
//               </Link>
//               <Link to="/about" className="hover:text-white">
//                 About Us
//               </Link>
//             </div>
//           </div>

//           <div>
//             <h3 className="font-bold text-white">Services</h3>
//             <div className="mt-4 flex flex-col gap-3">
//               <span>PAN Card</span>
//               <span>Passport</span>
//               <span>Certificates</span>
//               <span>GST and ITR</span>
//             </div>
//           </div>

//           <div>
//             <h3 className="font-bold text-white">Contact</h3>
//             <div className="mt-4 space-y-3 text-slate-400">
//               <p>support@karlo.in</p>
//               <p>+91 98765 43210</p>
//               <p>Monday–Saturday, 9 AM–7 PM</p>
//             </div>
//           </div>
//         </div>

//         <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-500">
//           © {new Date().getFullYear()} Karlo Services. All rights reserved.
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default Home;
