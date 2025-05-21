/**
 * Key for accessing recently viewed products in localStorage.
 * @const {string}
 */
const RVP_LOCAL_STORAGE_KEY = 'recentlyViewed';

/**
 * Adds a product handle to the 'recentlyViewed' list in localStorage.
 * Ensures uniqueness and limits the list size.
 * This function should be called on product pages.
 *
 * @param {string} productHandle - The handle of the product to add.
 * @param {number} [maxItems=10] - Maximum number of items to store in the list.
 */
function addRecentlyViewedProduct(productHandle, maxItems = 10) {
  if (!productHandle || typeof productHandle !== 'string' || productHandle.trim() === '') {
    console.warn('[RVP] addRecentlyViewedProduct: Ungültiger oder leerer Produkt-Handle erhalten.', productHandle);
    return;
  }

  try {
    const viewedProductsJson = localStorage.getItem(RVP_LOCAL_STORAGE_KEY);
    let viewedProducts = [];

    if (viewedProductsJson) {
      try {
        viewedProducts = JSON.parse(viewedProductsJson);
        if (!Array.isArray(viewedProducts)) {
          console.warn(
            `[RVP] addRecentlyViewedProduct: localStorage "${RVP_LOCAL_STORAGE_KEY}" enthält keinen gültigen Array. Liste wird zurückgesetzt.`
          );
          viewedProducts = [];
        }
      } catch (parseError) {
        console.error(
          `[RVP] addRecentlyViewedProduct: Fehler beim Parsen von localStorage "${RVP_LOCAL_STORAGE_KEY}":`,
          parseError
        );
        viewedProducts = [];
      }
    }

    viewedProducts = viewedProducts.filter((handle) => handle !== productHandle);
    viewedProducts.unshift(productHandle);
    viewedProducts = viewedProducts.slice(0, maxItems);
    localStorage.setItem(RVP_LOCAL_STORAGE_KEY, JSON.stringify(viewedProducts));

    console.log(
      // Dieser Log ist nützlich für das Debugging des LocalStorage-Inhalts, kann aber auch reduziert werden.
      `[RVP] ✅ Produkt '${productHandle}' zu '${RVP_LOCAL_STORAGE_KEY}' hinzugefügt/aktualisiert. Aktuelle Liste (${viewedProducts.length} Einträge):`,
      viewedProducts
    );
  } catch (error) {
    console.error(
      `[RVP] ❌ Fehler bei localStorage Operation für "${RVP_LOCAL_STORAGE_KEY}" in addRecentlyViewedProduct:`,
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
  /**
   * Constructs the Custom Element.
   */
  constructor() {
    super();
    // console.log('[RVP] RecentlyViewedProducts: Konstruktor aufgerufen.'); // Kann entfernt werden
    this.swiperInstance = null; // Property für die Swiper-Instanz initialisieren
  }

  /**
   * Called when the element is inserted into the DOM.
   * This is the main entry point for the element's logic.
   */
  connectedCallback() {
    // console.log('[RVP] RecentlyViewedProducts Custom Element connected to the DOM'); // Kann entfernt werden
    this.loadAndDisplayProducts();
  }

  /**
   * Called when the element is removed from the DOM.
   * Useful for cleanup tasks like destroying the Swiper instance.
   */
  disconnectedCallback() {
    // console.log('[RVP] RecentlyViewedProducts Custom Element disconnected from the DOM'); // Kann entfernt werden
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true); // Parameter: destroyElements, cleanStyles
      console.log('[RVP] Swiper Instanz zerstört.'); // Nützlicher Log für Cleanup
      this.swiperInstance = null;
    }
  }

  /**
   * Orchestrates the loading of recently viewed product data and triggers rendering.
   */
  async loadAndDisplayProducts() {
    // console.log('[RVP] loadAndDisplayProducts: Funktion gestartet.'); // Kann entfernt werden
    // Optional: Ladeindikator anzeigen
    // this.innerHTML = '<p>Lade kürzlich angesehene Produkte...</p>';

    try {
      const viewedProductsJson = localStorage.getItem(RVP_LOCAL_STORAGE_KEY);
      let productHandles = [];

      if (viewedProductsJson) {
        try {
          productHandles = JSON.parse(viewedProductsJson);
          if (!Array.isArray(productHandles)) {
            console.warn(/* ... */);
            productHandles = [];
          }
        } catch (parseError) {
          console.error(/* ... */);
          productHandles = [];
        }
      }
      // console.log('[RVP] loadAndDisplayProducts: Geladene Produkt-Handles:', productHandles); // Kann entfernt werden

      const maxProductsToDisplay = parseInt(this.dataset.maxProducts, 10) || 10; // Standard auf 10, wenn du alle aus dem Storage willst
      // console.log(`[RVP] loadAndDisplayProducts: Max Produkte zum Anzeigen (aus Einstellung oder Standard): ${maxProductsToDisplay}`); // Kann entfernt werden

      const handlesToFetch = productHandles.slice(0, maxProductsToDisplay);
      // console.log('[RVP] loadAndDisplayProducts: Handles, die abgerufen werden:', handlesToFetch); // Kann entfernt werden

      if (handlesToFetch.length > 0) {
        // console.log('[RVP] loadAndDisplayProducts: Rufe fetchProductData für jedes Handle auf.'); // Kann entfernt werden
        try {
          const productsData = await Promise.all(handlesToFetch.map((handle) => this.fetchProductData(handle)));
          const validProducts = productsData.filter((product) => product !== null);
          // console.log('[RVP] loadAndDisplayProducts: Produktdaten erfolgreich abgerufen:', validProducts); // Kann entfernt werden
          this.renderProducts(validProducts);
        } catch (fetchError) {
          console.error(
            '[RVP] loadAndDisplayProducts: Schwerwiegender Fehler beim Abrufen der Produktdaten:',
            fetchError
          );
          this.innerHTML = '<p>Fehler beim Laden der Produktdetails.</p>';
        }
      } else {
        this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>';
        // console.log('[RVP] loadAndDisplayProducts: Keine Produkte zum Anzeigen vorhanden.'); // Kann entfernt werden
      }
    } catch (error) {
      console.error(
        `[RVP] ❌ Fehler bei localStorage Operation für "${RVP_LOCAL_STORAGE_KEY}" in loadAndDisplayProducts:`,
        error
      );
      this.innerHTML = '<p>Fehler beim Laden der kürzlich angesehenen Produkte.</p>';
    }
  }

  /**
   * Fetches product data for a given handle from Shopify's JSON endpoint.
   * @async
   * @param {string} handle - The product handle.
   * @returns {Promise<object|null>} A promise that resolves with the product data object or null on error.
   */
  async fetchProductData(handle) {
    if (!handle || typeof handle !== 'string' || handle.trim() === '') {
      console.warn('[RVP] fetchProductData: Ungültiger oder leerer Handle gegeben.', handle);
      return null;
    }
    if (typeof window.shopUrl === 'undefined') {
      console.error('[RVP] fetchProductData: window.shopUrl ist nicht definiert!');
      return null;
    }
    const url = `${window.shopUrl}/products/${handle}.json`;
    // console.log(`[RVP] fetchProductData: Rufe Daten ab von: ${url}`); // Kann entfernt werden

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          // Wichtiger Fehler-Log
          `[RVP] fetchProductData: Fehler beim Abrufen von ${url}: ${response.status} ${response.statusText}`
        );
        return null;
      }
      const data = await response.json();
      // console.log(`[RVP] fetchProductData: Daten erfolgreich abgerufen für ${handle}.`); // Kann entfernt werden
      return data.product;
    } catch (error) {
      // Netzwerkfehler etc.
      console.error(`[RVP] fetchProductData: Fehler beim Fetch für ${url}:`, error); // Wichtiger Fehler-Log
      return null;
    }
  }

  /**
   * Renders the fetched product data into the Custom Element's DOM.
   * This method also initializes the carousel library (Swiper).
   *
   * @param {Array<object>} products - An array of product data objects.
   */
  renderProducts(products) {
    // console.log('[RVP] renderProducts: Rendere Produkte.', products); // Kann entfernt werden

    if (!products || products.length === 0) {
      this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>';
      // console.log('[RVP] renderProducts: Keine Produkte zum Anzeigen gefunden.'); // Kann entfernt werden
      return;
    }

    this.innerHTML = '';

    const carouselHtml = `
      <div class="swiper recently-viewed-products-swiper">
        <div class="swiper-wrapper"></div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-pagination"></div>
      </div>`;
    this.innerHTML = carouselHtml;

    const swiperWrapper = this.querySelector('.swiper-wrapper');
    if (!swiperWrapper) {
      console.error('[RVP] renderProducts: Swiper Wrapper Element nicht gefunden!'); // Wichtiger Fehler-Log
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>';
      return;
    }

    let productSlidesHtml = '';
    products.forEach((product) => {
      const imageUrl =
        (typeof product.featured_image === 'string' &&
          product.featured_image.trim() !== '' &&
          product.featured_image) ||
        product.images?.[0]?.src ||
        null;
      const imageAlt = product.title || 'Produktbild';
      let priceHtml = '';
      const firstVariant = product.variants?.[0];

      if (firstVariant?.price !== undefined && firstVariant.price !== null) {
        const priceValue = parseFloat(firstVariant.price);
        if (!isNaN(priceValue)) {
          const shopCurrencyCode = window.Shopify?.currency?.active || '';
          let finalPriceString = '';

          if (shopCurrencyCode === 'EUR') {
            finalPriceString = `€${priceValue.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} EUR`;
          } else if (shopCurrencyCode) {
            finalPriceString = `${priceValue.toFixed(2)} ${shopCurrencyCode}`;
          } else {
            finalPriceString = priceValue.toFixed(2);
          }
          priceHtml = `<p class="recently-viewed-product-price">${finalPriceString}</p>`;
          // console.log(`[RVP] Preis für ${product.handle} formatiert: ${finalPriceString}`); // Kann entfernt werden
        } else {
          console.warn(/* ... */);
        }
      } else {
        console.warn(/* ... */);
      }

      productSlidesHtml += `
        <div class="swiper-slide recently-viewed-product-slide">
          <div class="recently-viewed-product-content">
            <a href="/products/${product.handle}" class="recently-viewed-product-link">
              ${
                imageUrl
                  ? `<img class="recently-viewed-product-image" src="${imageUrl}" alt="${imageAlt}" loading="lazy" width="150" height="150">`
                  : '<div class="recently-viewed-product-image placeholder-image">Kein Bild</div>'
              }
              <h3 class="recently-viewed-product-title">${product.title || 'Unbenanntes Produkt'}</h3>
              ${priceHtml}
            </a>
          </div>
        </div>`;
    });

    swiperWrapper.innerHTML = productSlidesHtml;
    // console.log('[RVP] renderProducts: Produktdaten als Swiper Slides in Wrapper eingefügt.'); // Kann entfernt werden

    const swiperElement = this.querySelector('.recently-viewed-products-swiper');
    if (swiperElement && typeof Swiper !== 'undefined') {
      // console.log('[RVP] renderProducts: Swiper Element gefunden, initialisiere Swiper.'); // Kann entfernt werden

      if (this.swiperInstance) {
        // BEST PRACTICE: Zerstöre alte Instanz, falls vorhanden
        this.swiperInstance.destroy(true, true);
      }
      this.swiperInstance = new Swiper(swiperElement, {
        // Speichere Instanz
        slidesPerView: 'auto',
        spaceBetween: 20,
        loop:
          products.length > 1 &&
          products.length > (this.swiperInstance?.params.slidesPerView || parseInt(this.dataset.maxProducts, 10) || 4), // Sicherere Loop-Bedingung
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        breakpoints: {
          640: { slidesPerView: 2, spaceBetween: 20 },
          768: { slidesPerView: 3, spaceBetween: 40 },
          1024: { slidesPerView: 4, spaceBetween: 50 },
        },
      });
      // console.log('[RVP] renderProducts: Swiper initialisiert.', this.swiperInstance); // Kann entfernt werden
    } else if (typeof Swiper === 'undefined') {
      console.error(/* ... */);
      this.innerHTML = '<p>Error: Carousel library could not be loaded.</p>';
    } else {
      console.error(/* ... */);
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>';
    }
  }
}

if (!customElements.get('recently-viewed-products')) {
  // console.log('[RVP] Definiere Custom Element "recently-viewed-products".'); // Kann entfernt werden
  customElements.define('recently-viewed-products', RecentlyViewedProducts);
} // else { console.log(...) } // Kann entfernt werden
