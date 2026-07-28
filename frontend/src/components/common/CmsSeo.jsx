import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getPublicSeo } from "../../api/publicCmsApi";
import SeoMeta from "./SeoMeta";

const CmsSeo = ({ pageKey, overrides = {} }) => {
  const context = useOutletContext() || {};
  const [pageSeo, setPageSeo] = useState({});

  useEffect(() => {
    let active = true;
    getPublicSeo(pageKey)
      .then((response) => active && setPageSeo(response.data?.item || {}))
      .catch(() => active && setPageSeo({}));
    return () => { active = false; };
  }, [pageKey]);

  return <SeoMeta defaults={context.data?.siteSettings?.seo} seo={{ ...pageSeo, ...overrides }} />;
};

export default CmsSeo;
