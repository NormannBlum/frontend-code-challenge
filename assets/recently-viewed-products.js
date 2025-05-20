/**
 * Adds a product handle to the 'recentlyViewed' list in localStorage.
 * Ensures uniqueness and limits the list size.
 * This function should be called on product pages.
 *
 * @param {string} productHandle - The handle of the product to add.
 * @param {number} [maxItems=10] - Maximum number of items to store in the list.
 */
function addRecentlyViewedProduct(productHandle, maxItems = 10) {
  console.log(
    '[RVP] addRecentlyViewedProduct: Funktion gestartet mit Handle:',
    productHandle,
    'und maxItems:',
    maxItems
  );

  if (!productHandle || typeof productHandle !== 'string') {
    console.warn('[RVP] addRecentlyViewedProduct: Ungültiger Produkt-Handle erhalten.', productHandle);
    return;
  }

  try {
    console.log('[RVP] addRecentlyViewedProduct: Lese "recentlyViewed" aus localStorage.');
    const viewedProductsJson = localStorage.getItem('recentlyViewed');
    let viewedProducts = [];
    console.log('[RVP] addRecentlyViewedProduct: Rohwert aus localStorage:', viewedProductsJson);

    if (viewedProductsJson) {
      try {
        console.log('[RVP] addRecentlyViewedProduct: Parse "recentlyViewed" JSON.');
        viewedProducts = JSON.parse(viewedProductsJson);
        if (!Array.isArray(viewedProducts)) {
          console.warn(
            '[RVP] addRecentlyViewedProduct: localStorage "recentlyViewed" enthält keinen gültigen Array. Liste wird zurückgesetzt.'
          );
          viewedProducts = [];
        }
      } catch (parseError) {
        console.error(
          '[RVP] addRecentlyViewedProduct: Fehler beim Parsen von localStorage "recentlyViewed":',
          parseError
        );
        viewedProducts = [];
      }
    }

    console.log('[RVP] addRecentlyViewedProduct: Filtere bestehende Handles. Aktueller Handle:', productHandle);
    viewedProducts = viewedProducts.filter((handle) => handle !== productHandle);

    console.log('[RVP] addRecentlyViewedProduct: Füge Handle am Anfang hinzu.');
    viewedProducts.unshift(productHandle);

    console.log('[RVP] addRecentlyViewedProduct: Begrenze Liste auf maxItems:', maxItems);
    viewedProducts = viewedProducts.slice(0, maxItems);

    console.log('[RVP] addRecentlyViewedProduct: Speichere aktualisierte Liste in localStorage:', viewedProducts);
    localStorage.setItem('recentlyViewed', JSON.stringify(viewedProducts));

    console.log(
      `[RVP] ✅ Produkt '${productHandle}' zu 'recentlyViewed' hinzugefügt/aktualisiert. Aktuelle Liste (${viewedProducts.length} Einträge):`,
      viewedProducts
    );
  } catch (error) {
    console.error(
      '[RVP] ❌ Fehler bei localStorage Operation für "recentlyViewed" in addRecentlyViewedProduct:',
      error
    );
  }
}

/**
 * Custom Element to display recently viewed products in a carousel.
 * Reads product handles from localStorage, fetches product data, and renders them in a carousel.
 *
 * @class RecentlyViewedProducts
 * @extends HTMLElement
 */
class RecentlyViewedProducts extends HTMLElement {
  constructor() {
    super(); // Immer zuerst super() im constructor aufrufen bei Custom Elements
    console.log('[RVP] RecentlyViewedProducts: Konstruktor aufgerufen.');
    // Optional: Hier Shadow DOM einrichten oder initiale DOM-Struktur erstellen
  }

  /**
   * Called when the element is inserted into the DOM.
   * This is the main entry point for the element's logic.
   * Reads data from localStorage and starts the fetching process.
   */
  connectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element connected to the DOM');
    this.loadAndDisplayProducts();
  }

  disconnectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element disconnected from the DOM');
  }

  loadAndDisplayProducts() {
    console.log('[RVP] loadAndDisplayProducts: Funktion gestartet.');
    try {
      console.log('[RVP] loadAndDisplayProducts: Lese "recentlyViewed" aus localStorage.');
      const viewedProductsJson = localStorage.getItem('recentlyViewed');
      let productHandles = [];
      console.log('[RVP] loadAndDisplayProducts: Rohwert aus localStorage:', viewedProductsJson);

      if (viewedProductsJson) {
        try {
          productHandles = JSON.parse(viewedProductsJson);
          if (!Array.isArray(productHandles)) {
            console.warn(
              '[RVP] loadAndDisplayProducts: "recentlyViewed" aus localStorage ist kein Array. Setze zurück.'
            );
            productHandles = [];
          }
        } catch (parseError) {
          console.error('[RVP] loadAndDisplayProducts: Fehler beim Parsen von "recentlyViewed":', parseError);
          productHandles = [];
        }
      }

      console.log('[RVP] loadAndDisplayProducts: Geladene Produkt-Handles:', productHandles);

      const maxProductsToDisplay = parseInt(this.dataset.maxProducts, 10) || 4; // Lese data-max-products Attribut, Standard 4
      console.log(`[RVP] loadAndDisplayProducts: Max Produkte zum Anzeigen (aus Einstellung): ${maxProductsToDisplay}`);

      // Begrenze die Anzahl der Handles, die wir abrufen
      const handlesToFetch = productHandles.slice(0, maxProductsToDisplay);
      console.log('[RVP] loadAndDisplayProducts: Handles, die abgerufen werden:', handlesToFetch);

      if (handlesToFetch.length > 0) {
        // Hier beginnt die Logik zum Abrufen der Produktdaten
        console.log('[RVP] loadAndDisplayProducts: Rufe fetchProductData für jedes Handle auf.');

        const fetchPromises = handlesToFetch.map((handle) => this.fetchProductData(handle));

        Promise.all(fetchPromises)
          .then((productsData) => {
            // Filtere fehlgeschlagene Abrufe heraus (falls fetchProductData null zurückgibt bei Fehler)
            const validProducts = productsData.filter((product) => product !== null);
            console.log('[RVP] loadAndDisplayProducts: Produktdaten erfolgreich abgerufen:', validProducts);
            this.renderProducts(validProducts);
          })
          .catch((error) => {
            console.error('[RVP] loadAndDisplayProducts: Fehler beim Abrufen der Produktdaten:', error);
            this.innerHTML = '<p>Fehler beim Laden der Produktdetails.</p>';
          });
      } else {
        this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>';
        console.log('[RVP] loadAndDisplayProducts: Keine Produkte zum Anzeigen vorhanden.');
      }
    } catch (error) {
      console.error('[RVP] ❌ Fehler bei localStorage Operation in loadAndDisplayProducts:', error);
      this.innerHTML = '<p>Fehler beim Laden der kürzlich angesehenen Produkte.</p>';
    }
  }

  /**
   * Fetches product data for a given handle from Shopify's JSON endpoint.
   * @param {string} handle - The product handle.
   * @returns {Promise<object|null>} A promise that resolves with the product data object or null on error.
   */
  async fetchProductData(handle) {
    if (!handle) {
      console.warn('[RVP] fetchProductData: Kein Handle gegeben.');
      return null;
    }
    // Baue die URL für den JSON-Endpunkt. window.shopUrl kommt aus theme.liquid.
    if (typeof window.shopUrl === 'undefined') {
      console.error('[RVP] fetchProductData: window.shopUrl ist nicht definiert!');
      return null;
    }
    const url = `${window.shopUrl}/products/${handle}.json`;
    console.log(`[RVP] fetchProductData: Rufe Daten ab von: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `[RVP] fetchProductData: Fehler beim Abrufen von ${url}: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      console.log(`[RVP] fetchProductData: Daten erfolgreich abgerufen für ${handle}.`);
      // Shopify's .json Endpunkt gibt ein Objekt mit einem 'product' Schlüssel zurück
      return data.product;
    } catch (error) {
      console.error(`[RVP] fetchProductData: Fehler beim Fetch für ${url}:`, error);
      return null;
    }
  }

  /**
   * Renders the fetched product data into the Custom Element's DOM.
   * This method should also initialize the carousel library (Swiper).
   *
   * @param {Array<object>} products - An array of product data objects.
   */
  renderProducts(products) {
    console.log('[RVP] renderProducts: Rendere Produkte.', products);

    // Zeige eine Meldung an, wenn keine Produkte zum Anzeigen vorhanden sind
    if (!products || products.length === 0) {
      this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>';
      console.log('[RVP] renderProducts: Keine Produkte zum Anzeigen gefunden.');
      return; // Beende die Funktion, wenn keine Produkte da sind
    }

    // Entferne vorherigen Inhalt (z.B. Platzhalter oder Lade-Indikator, oder vorherige Produktliste)
    this.innerHTML = '';

    // --- ERSTELLE DAS HTML-MARKUP FÜR SWIPER ---
    let carouselHtml = `
      <div class="swiper recently-viewed-products-swiper">
        <div class="swiper-wrapper">
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-scrollbar"></div>
      </div>
    `;

    // Füge das Grundgerüst in das Custom Element ein
    this.innerHTML = carouselHtml;

    // Finde den Swiper Wrapper im DOM deines Custom Elements, da wir die Slides dort einf\u00FCgen
    const swiperWrapper = this.querySelector('.swiper-wrapper');

    if (!swiperWrapper) {
      console.error('[RVP] renderProducts: Swiper Wrapper Element nicht gefunden!');
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>';
      return; // Beende, wenn der Wrapper fehlt
    }

    // --- FÜGE DIE PRODUKTE ALS SWIPER SLIDES HINZU ---
    let productSlidesHtml = '';

    // INNERHALB der renderProducts-Methode, in der products.forEach-Schleife:
    products.forEach((product) => {
      console.log('[RVP] ----- START Produkt-Objekt für Rendering -----');
      console.log(product);
      console.log('[RVP] Wert von product.featured_image:', product.featured_image);
      console.log('[RVP] Typ von product.featured_image:', typeof product.featured_image);

      let imageUrl = null;
      if (product.featured_image) {
        imageUrl = product.featured_image; // Nutze das featured_image, wenn es existiert (und ein String ist)
        console.log('[RVP] Verwende product.featured_image:', imageUrl);
      } else if (product.images && product.images.length > 0 && product.images[0].src) {
        imageUrl = product.images[0].src; // Nutze das erste Bild aus dem images-Array, wenn featured_image fehlt
        console.log('[RVP] Verwende erstes Bild aus product.images[0].src:', imageUrl);
      } else {
        console.log('[RVP] Kein featured_image und kein images-Array mit src gefunden für Produkt:', product.handle);
      }
      console.log('[RVP] ----- ENDE Produkt-Objekt für Rendering -----');

      const imageAlt = product.title || 'Produktbild';

      productSlidesHtml += `
      <div class="swiper-slide recently-viewed-product-slide">
        <div class="recently-viewed-product-content">
          <a href="/products/${product.handle}" class="recently-viewed-product-link">
            ${
              imageUrl
                ? `<img class="recently-viewed-product-image" src="${imageUrl}"
                     alt="${imageAlt}"
                     loading="lazy"
                     width="150" 
                     height="150">`
                : '<div class="recently-viewed-product-image placeholder-image">Kein Bild</div>'
            }
            <h3 class="recently-viewed-product-title">${product.title || 'Unbenanntes Produkt'}</h3>
            ${
              product.price !== undefined
                ? `<p class="recently-viewed-product-price">${(product.price / 100).toFixed(2)}</p>` // Währung vorerst weggelassen für Einfachheit
                : ''
            }
          </a>
        </div>
      </div>
    `;
    });

    // Füge die generierten Slides in den Swiper Wrapper ein
    swiperWrapper.innerHTML = productSlidesHtml;

    console.log('[RVP] renderProducts: Produktdaten als Swiper Slides in Wrapper eingefügt.');

    // --- INITIALISIERE SWIPER ---
    const swiperElement = this.querySelector('.recently-viewed-products-swiper');

    if (swiperElement && typeof Swiper !== 'undefined') {
      console.log('[RVP] renderProducts: Swiper Element gefunden, initialisiere Swiper.');

      const mySwiper = new Swiper(swiperElement, {
        slidesPerView: 'auto', // Zeigt so viele Slides wie reinpassen
        spaceBetween: 20,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 40,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 50,
          },
        },
      });
      console.log('[RVP] renderProducts: Swiper initialisiert.', mySwiper);
    } else if (typeof Swiper === 'undefined') {
      console.error(
        '[RVP] renderProducts: Swiper JS Bibliothek nicht geladen! Stelle sicher, dass sie in theme.liquid oder im Snippet eingebunden ist.'
      );
      this.innerHTML = '<p>Fehler: Karussell-Bibliothek konnte nicht geladen werden.</p>';
    } else {
      console.error(
        '[RVP] renderProducts: Swiper Container-Element (.recently-viewed-products-swiper) im DOM nicht gefunden!'
      );
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>';
    }
  }

  // Hier werden später weitere Methoden hinzukommen (z.B. für Karussell-Event-Handler)
}

// Definiere das Custom Element und verknüpfe es mit einem HTML-Tag
// Das Tag wird dann im HTML des Snippets verwendet: <recently-viewed-products></recently-viewed-products>
// Stelle sicher, dass dies nur einmal ausgeführt wird
if (!customElements.get('recently-viewed-products')) {
  console.log('[RVP] Definiere Custom Element "recently-viewed-products".');
  customElements.define('recently-viewed-products', RecentlyViewedProducts);
} else {
  console.log('[RVP] Custom Element "recently-viewed-products" ist bereits definiert.');
}
