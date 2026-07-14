import { Link } from "react-router-dom";

const NotFound = () => <section className="px-4 py-24 text-center"><p className="font-semibold text-blue-700">404</p><h1 className="mt-2 text-4xl font-bold">Page not found</h1><Link to="/" className="mt-6 inline-block font-semibold text-blue-700">Return home</Link></section>;

export default NotFound;
