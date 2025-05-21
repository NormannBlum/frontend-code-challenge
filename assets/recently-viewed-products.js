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
    this.swiperInstance = null;
  }

  /**
   * Called when the element is inserted into the DOM.
   * This is the main entry point for the element's logic.
   */
  connectedCallback() {
    this.loadAndDisplayProducts();
  }

  /**
   * Called when the element is removed from the DOM.
   * Useful for cleanup tasks like destroying the Swiper instance.
   */
  disconnectedCallback() {
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

      const maxProductsToDisplay = parseInt(this.dataset.maxProducts, 10) || 10;
      const handlesToFetch = productHandles.slice(0, maxProductsToDisplay);

      if (handlesToFetch.length > 0) {
        try {
          const productsData = await Promise.all(handlesToFetch.map((handle) => this.fetchProductData(handle)));
          const validProducts = productsData.filter((product) => product !== null);
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

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `[RVP] fetchProductData: Fehler beim Abrufen von ${url}: ${response.status} ${response.statusText}`
        );
        return null;
      }
      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error(`[RVP] fetchProductData: Fehler beim Fetch für ${url}:`, error);
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
    if (!products || products.length === 0) {
      this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>';
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
      console.error('[RVP] renderProducts: Swiper Wrapper Element nicht gefunden!');
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

    const swiperElement = this.querySelector('.recently-viewed-products-swiper');
    if (swiperElement && typeof Swiper !== 'undefined') {
      if (this.swiperInstance) {
        this.swiperInstance.destroy(true, true);
      }
      this.swiperInstance = new Swiper(swiperElement, {
        slidesPerView: 'auto',
        spaceBetween: 20,
        loop:
          products.length > 1 &&
          products.length > (this.swiperInstance?.params.slidesPerView || parseInt(this.dataset.maxProducts, 10) || 4),
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
  customElements.define('recently-viewed-products', RecentlyViewedProducts);
}
