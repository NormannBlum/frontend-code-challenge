/**
 * Adds a product handle to the 'recentlyViewed' list in localStorage.
 * Ensures uniqueness and limits the list size.
 * This function should be called on product pages.
 *
 * @param {string} productHandle - The handle of the product to add.
 * @param {number} [maxItems=10] - Maximum number of items to store in the list.
 */
function addRecentlyViewedProduct(productHandle, maxItems = 10) {
  if (!productHandle || typeof productHandle !== 'string') {
    console.warn('[RVP] addRecentlyViewedProduct: Ungültiger Produkt-Handle erhalten.', productHandle);
    return;
  }

  try {
    const viewedProductsJson = localStorage.getItem('recentlyViewed');
    let viewedProducts = [];

    if (viewedProductsJson) {
      try {
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

    viewedProducts = viewedProducts.filter((handle) => handle !== productHandle);
    viewedProducts.unshift(productHandle);
    viewedProducts = viewedProducts.slice(0, maxItems);

    localStorage.setItem('recentlyViewed', JSON.stringify(viewedProducts));

    console.log(
      `[RVP] ✅ Produkt '${productHandle}' zu 'recentlyViewed' hinzugefügt/aktualisiert. (${viewedProducts.length} Einträge).`
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
  /**
   * Constructs the Custom Element.
   */
  constructor() {
    super();
  }

  /**
   * Called when the element is inserted into the DOM.
   */
  connectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element connected to the DOM');
    this.loadAndDisplayProducts();
  }

  /**
   * Called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element disconnected from the DOM');
  }

  /**
   * Orchestrates the loading of recently viewed product data and triggers rendering.
   */
  loadAndDisplayProducts() {
    try {
      const viewedProductsJson = localStorage.getItem('recentlyViewed');
      let productHandles = [];

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

      const maxProductsToDisplay = 10;
      const handlesToFetch = productHandles.slice(0, maxProductsToDisplay);

      if (handlesToFetch.length > 0) {
        const fetchPromises = handlesToFetch.map((handle) => this.fetchProductData(handle));

        Promise.all(fetchPromises)
          .then((productsData) => {
            const validProducts = productsData.filter((product) => product !== null);
            console.log(`[RVP] loadAndDisplayProducts: ${validProducts.length} Produktdaten erfolgreich abgerufen.`);
            this.renderProducts(validProducts);
          })
          .catch((error) => {
            console.error('[RVP] loadAndDisplayProducts: Fehler beim Abrufen der Produktdaten:', error);
            this.innerHTML = '<p>Error loading product details.</p>';
          });
      } else {
        this.innerHTML = '<p>No products viewed recently.</p>';
        console.log('[RVP] loadAndDisplayProducts: Keine Produkte zum Anzeigen vorhanden.');
      }
    } catch (error) {
      console.error('[RVP] ❌ Fehler bei localStorage Operation in loadAndDisplayProducts:', error);
      this.innerHTML = '<p>Error loading recently viewed products.</p>';
    }
  }

  /**
   * Fetches product data for a given handle from Shopify's JSON endpoint.
   * @async
   * @param {string} handle - The product handle.
   * @returns {Promise<object|null>} A promise that resolves with the product data object or null on error.
   */
  async fetchProductData(handle) {
    if (!handle) {
      console.warn('[RVP] fetchProductData: Kein Handle gegeben.');
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
   * @param {Array<object>} products - An array of product data objects.
   */
  renderProducts(products) {
    if (!products || products.length === 0) {
      this.innerHTML = '<p>No products viewed recently.</p>';
      console.log('[RVP] renderProducts: Keine Produkte zum Anzeigen gefunden.');
      return;
    }

    this.innerHTML = ''; // Vorherigen Inhalt entfernen

    let carouselHtml = `
      <div class="swiper recently-viewed-products-swiper">
        <div class="swiper-wrapper">
        </div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-pagination"></div>
      </div>
    `;
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

      if (firstVariant && firstVariant.price !== undefined && firstVariant.price !== null) {
        const priceValue = parseFloat(firstVariant.price);

        if (!isNaN(priceValue)) {
          const shopCurrencyCode = window.Shopify?.currency?.active || '';
          let currencySymbolPrefix = '';
          let currencyCodeSuffix = '';
          let priceString = priceValue.toFixed(2);

          if (shopCurrencyCode === 'EUR') {
            currencySymbolPrefix = '€';
            priceString = priceString.replace('.', ',');
            priceHtml = `<p class="recently-viewed-product-price">${priceString}${currencySymbolPrefix}</p>`; // Symbol nach Preis für EUR
          } else if (shopCurrencyCode) {
            currencyCodeSuffix = ` ${shopCurrencyCode}`;
            priceHtml = `<p class="recently-viewed-product-price">${currencySymbolPrefix}${priceString}${currencyCodeSuffix}</p>`;
          } else {
            priceHtml = `<p class="recently-viewed-product-price">${priceString}</p>`;
          }
        } else {
          console.warn(
            `[RVP] Preis für ${product.handle} konnte nicht in eine Zahl umgewandelt werden:`,
            firstVariant.price
          );
        }
      } else {
        console.warn(`[RVP] Keine gültige erste Variante oder kein Preis für Produkt ${product.handle} gefunden.`);
      }

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
          ${priceHtml}
        </a>
      </div>
    </div>
  `;
    });

    swiperWrapper.innerHTML = productSlidesHtml;

    const swiperElement = this.querySelector('.recently-viewed-products-swiper');
    if (swiperElement && typeof Swiper !== 'undefined') {
      const mySwiper = new Swiper(swiperElement, {
        slidesPerView: 'auto',
        spaceBetween: 20,
        loop: products.length > 1, // Loop nur wenn genug Slides da sind
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
      console.log('[RVP] renderProducts: Swiper initialisiert.');
    } else if (typeof Swiper === 'undefined') {
      console.error(
        '[RVP] renderProducts: Swiper JS Bibliothek nicht geladen! Stelle sicher, dass sie in theme.liquid oder im Snippet eingebunden ist.'
      );
      this.innerHTML = '<p>Error: Carousel library could not be loaded.</p>';
    } else {
      console.error(
        '[RVP] renderProducts: Swiper Container-Element (.recently-viewed-products-swiper) im DOM nicht gefunden!'
      );
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>';
    }
  }
}

if (!customElements.get('recently-viewed-products')) {
  console.log('[RVP] Definiere Custom Element "recently-viewed-products".');
  customElements.define('recently-viewed-products', RecentlyViewedProducts);
} else {
  console.log('[RVP] Custom Element "recently-viewed-products" ist bereits definiert.');
}
