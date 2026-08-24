import { useEffect } from 'react';
import {
  DEFAULT_OG_IMAGE,
  HOME_DESCRIPTION,
  HOME_TITLE,
  SEO_TITLE_SUFFIX,
  absoluteUrl,
} from '../lib/seo';

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
};

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSON_LD_ID = 'page-json-ld';

/** Atualiza title, description, Open Graph e canonical da rota atual. */
export function usePageSeo({
  title,
  description,
  path,
  noIndex = false,
  image,
  jsonLd,
}: PageSeoInput) {
  useEffect(() => {
    const fullTitle = title.includes(SEO_TITLE_SUFFIX)
      ? title
      : `${title} | ${SEO_TITLE_SUFFIX}`;
    const desc = description.trim() || HOME_DESCRIPTION;
    const url = absoluteUrl(path || '/');
    const ogImage = image || DEFAULT_OG_IMAGE;

    document.title = fullTitle || HOME_TITLE;

    upsertMeta('meta[name="description"]', {
      name: 'description',
      content: desc,
    });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: jsonLd?.['@type'] === 'Event' ? 'website' : 'website',
    });
    upsertMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: 'pt_BR',
    });
    upsertMeta('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: SEO_TITLE_SUFFIX,
    });
    upsertMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: fullTitle,
    });
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: desc,
    });
    upsertMeta('meta[property="og:url"]', {
      property: 'og:url',
      content: url,
    });
    upsertMeta('meta[property="og:image"]', {
      property: 'og:image',
      content: ogImage,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: fullTitle,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: desc,
    });
    upsertLink('canonical', url);

    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = JSON_LD_ID;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }
  }, [title, description, path, noIndex, image, jsonLd]);
}
