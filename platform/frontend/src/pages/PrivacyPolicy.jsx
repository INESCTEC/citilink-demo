import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { useTranslation } from "react-i18next";

function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-sky-900 dark:bg-gray-900 pt-15">
      <Navbar />
      <div className="bg-white min-h-[65vh] flex justify-center items-center">
        <div className="container mx-auto p-6 pb-15 max-w-5xl">
          <h1 className="text-3xl font-bold text-sky-900 font-montserrat mb-2">
            {t("privacyPolicy.title")}
          </h1>
          <p className="text-gray-700 mt-2 font-montserrat text-justify italic mb-6">
            {t("privacyPolicy.lastUpdated")}
          </p>

          <div className="space-y-6">
            {/* Welcome Section */}
            <div>
              <p className="text-gray-900 font-montserrat text-justify font-semibold mb-2">
                {t("privacyPolicy.welcome")}
              </p>
              <p className="text-gray-700 font-montserrat text-justify">
                {t("privacyPolicy.welcomeDescription")}
              </p>
            </div>

            {/* Section 1 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section1.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section1.intro")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section1.useInfo")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section1.consent")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section1.publicData")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify italic">
                {t("privacyPolicy.section1.legalBasis")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section1.legitimateInterests")}
              </p>
              <ul className="list-disc list-inside text-gray-700 mt-2 font-montserrat text-justify ml-4 space-y-1">
                <li>{t("privacyPolicy.section1.interest1")}</li>
                <li>{t("privacyPolicy.section1.interest2")}</li>
                <li>{t("privacyPolicy.section1.interest3")}</li>
                <li>{t("privacyPolicy.section1.interest4")}</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section2.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section2.intro")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                <strong>{t("privacyPolicy.section2.newsletter").split(':')[0]}:</strong>{' '}
                {t("privacyPolicy.section2.newsletter").split(':')[1]}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                <strong>{t("privacyPolicy.section2.usageData").split(':')[0]}:</strong>{' '}
                {t("privacyPolicy.section2.usageData").split(':')[1]}
              </p>
              <ul className="list-disc list-inside text-gray-700 mt-2 font-montserrat text-justify ml-4 space-y-1">
                <li>{t("privacyPolicy.section2.logItem1")}</li>
                <li>{t("privacyPolicy.section2.logItem2")}</li>
                <li>{t("privacyPolicy.section2.logItem3")}</li>
                <li>{t("privacyPolicy.section2.logItem4")}</li>
                <li>{t("privacyPolicy.section2.logItem5")}</li>
                <li>{t("privacyPolicy.section2.logItem6")}</li>
              </ul>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section2.publicDocuments")}
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section3.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section3.controller")}
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section4.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section4.retention")}
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section5.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section5.sharing")}
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section6.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section6.intro")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section6.measures")}
              </p>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section7.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section7.intro")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section7.exercise")}
              </p>
              <p className="text-gray-700 mt-2 font-montserrat text-justify">
                {t("privacyPolicy.section7.complaint")}
              </p>
            </div>

            {/* Section 8 */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mt-6 font-montserrat">
                {t("privacyPolicy.section8.title")}
              </h2>
              <p className="text-gray-700 mt-3 font-montserrat text-justify">
                {t("privacyPolicy.section8.contact")}
              </p>
            </div>

            {/* Update Notice */}
            {/* <div className="mt-8 pt-4 border-t border-sky-800">
              <p className="text-sky-800 font-montserrat text-justify italic text-sm">
                {t("privacyPolicy.updateNotice")}
              </p>
            </div> */}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PrivacyPolicy;