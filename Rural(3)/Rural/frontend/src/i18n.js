import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import teTranslation from './locales/te.json';
import hiTranslation from './locales/hi.json';
import knTranslation from './locales/kn.json';

const resources = {
    en: {
        translation: enTranslation
    },
    te: {
        translation: teTranslation
    },
    hi: {
        translation: hiTranslation
    },
    kn: {
        translation: knTranslation
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
