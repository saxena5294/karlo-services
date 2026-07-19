import { faqApi } from "../../../api/adminCmsApi"; import CollectionManager from "./CollectionManager"; const FaqManager=()=> <CollectionManager type="faq" api={faqApi}/>; export default FaqManager;
