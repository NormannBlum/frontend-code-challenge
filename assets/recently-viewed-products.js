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
    // Optional: Hier kannst du Shadow DOM einrichten oder initiale DOM-Struktur erstellen
  }

  /**
   * Called when the element is inserted into the DOM.
   * This is the main entry point for the element's logic.
   * Reads data from localStorage and starts the fetching process.
   */
  connectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element connected to the DOM');
    // Starte den Prozess des Ladens und Anzeigens der Produkte
    this.loadAndDisplayProducts();
  }

  // Diese Methode wird aufgerufen, wenn das Element aus dem DOM entfernt wird
  // Nützlich, um Event-Listener aufzuräumen
  disconnectedCallback() {
    console.log('[RVP] RecentlyViewedProducts Custom Element disconnected from the DOM');
    // TODO: Hier Event-Listener oder Ressourcen aufräumen, falls nötig
  }

  // Optional: Beobachten von Attribut-Änderungen
  // static get observedAttributes() { return ['some-attribute']; }
  // attributeChangedCallback(name, oldValue, newValue) { ... }

  // Methode zum Laden der Handles aus localStorage und Starten des Datenabrufs
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

      // Berücksichtige die max_products Einstellung von der Section (falls an das Element übergeben)
      // Du musst einen Weg finden, diese Einstellung an dein Custom Element zu übergeben.
      // Eine gängige Methode ist über ein data-Attribut im HTML des Custom Elements im Snippet.
      const maxProductsToDisplay = parseInt(this.dataset.maxProducts, 10) || 4; // Lese data-max-products Attribut, Standard 4
      console.log(`[RVP] loadAndDisplayProducts: Max Produkte zum Anzeigen (aus Einstellung): ${maxProductsToDisplay}`);

      // Begrenze die Anzahl der Handles, die wir abrufen
      const handlesToFetch = productHandles.slice(0, maxProductsToDisplay);
      console.log('[RVP] loadAndDisplayProducts: Handles, die abgerufen werden:', handlesToFetch);

      if (handlesToFetch.length > 0) {
        // Hier beginnt die Logik zum Abrufen der Produktdaten
        console.log('[RVP] loadAndDisplayProducts: Rufe fetchProductData für jedes Handle auf.');

        // Array, um die Fetch-Promises zu speichern
        // Wir verwenden .map(), um für jeden Handle eine fetchPromise zu erstellen
        const fetchPromises = handlesToFetch.map((handle) => this.fetchProductData(handle));

        // Warte, bis alle Fetch-Anfragen abgeschlossen sind
        Promise.all(fetchPromises)
          .then((productsData) => {
            // Filtere fehlgeschlagene Abrufe heraus (falls fetchProductData null zurückgibt bei Fehler)
            const validProducts = productsData.filter((product) => product !== null);
            console.log('[RVP] loadAndDisplayProducts: Produktdaten erfolgreich abgerufen:', validProducts);

            // Rufe die Methode zum Rendern der Produkte auf
            this.renderProducts(validProducts);
          })
          .catch((error) => {
            console.error('[RVP] loadAndDisplayProducts: Fehler beim Abrufen der Produktdaten:', error);
            this.innerHTML = '<p>Fehler beim Laden der Produktdetails.</p>'; // Fehlermeldung im UI
          });
      } else {
        this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>'; // Meldung, wenn localStorage leer ist
        console.log('[RVP] loadAndDisplayProducts: Keine Produkte zum Anzeigen vorhanden.');
      }
    } catch (error) {
      console.error('[RVP] ❌ Fehler bei localStorage Operation in loadAndDisplayProducts:', error);
      this.innerHTML = '<p>Fehler beim Laden der kürzlich angesehenen Produkte.</p>'; // Fehlermeldung im UI
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
    // Stelle sicher, dass window.shopUrl gesetzt ist (haben wir in theme.liquid gemacht).
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
        return null; // Bei Fehler null zurückgeben
      }

      const data = await response.json();
      console.log(`[RVP] fetchProductData: Daten erfolgreich abgerufen für ${handle}.`);
      // Shopify's .json Endpunkt gibt ein Objekt mit einem 'product' Schlüssel zurück
      return data.product;
    } catch (error) {
      console.error(`[RVP] fetchProductData: Fehler beim Fetch für ${url}:`, error);
      return null; // Bei Fehler null zurückgeben
    }
  }

  /**
   * Renders the fetched product data into the Custom Element's DOM.
   * This method should also initialize the carousel library.
   *
   * @param {Array<object>} products - An array of product data objects.
   */
  renderProducts(products) {
    console.log('[RVP] renderProducts: Rendere Produkte.', products);

    // Zeige eine Meldung an, wenn keine Produkte zum Anzeigen vorhanden sind
    if (!products || products.length === 0) {
      this.innerHTML = '<p>Noch keine Produkte kürzlich angesehen.</p>'; // Oder eine andere geeignete Meldung
      console.log('[RVP] renderProducts: Keine Produkte zum Anzeigen gefunden.');
      return; // Beende die Funktion, wenn keine Produkte da sind
    }

    // Entferne vorherigen Inhalt (z.B. Platzhalter oder Lade-Indikator, oder vorherige Produktliste)
    this.innerHTML = '';

    // --- ERSTELLE DAS HTML-MARKUP FÜR SWIPER ---
    // Die Struktur folgt der Swiper Dokumentation: .swiper > .swiper-wrapper > .swiper-slide
    let carouselHtml = `
      <div class="swiper recently-viewed-products-swiper"> {# Haupt-Swiper-Container #}
        <div class="swiper-wrapper"> {# Wrapper für die Slides #}
          {# Die einzelnen Produkt-Slides werden hier dynamisch eingefügt #}
        </div>
        {# Optional: Pagination Dots - Füge diese Elemente außerhalb des swiper-wrapper aber innerhalb des swiper Containers hinzu #}
        <div class="swiper-pagination"></div>
        {# Optional: Navigation Pfeile - Füge diese Elemente außerhalb des swiper-wrapper aber innerhalb des swiper Containers hinzu #}
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        {# Optional: Scrollbar - Füge dieses Element außerhalb des swiper-wrapper aber innerhalb des swiper Containers hinzu #}
        <div class="swiper-scrollbar"></div>
      </div>
    `;

    // Füge das Grundgerüst in das Custom Element ein
    this.innerHTML = carouselHtml;

    // Finde den Swiper Wrapper im DOM deines Custom Elements, da wir die Slides dort einfügen
    const swiperWrapper = this.querySelector('.swiper-wrapper');

    if (!swiperWrapper) {
      console.error('[RVP] renderProducts: Swiper Wrapper Element nicht gefunden!');
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>'; // Zeige Fehlermeldung im UI
      return; // Beende, wenn der Wrapper fehlt
    }

    let productSlidesHtml = '';

    products.forEach((product) => {
      // Erstelle das HTML für ein einzelnes Produkt als Swiper Slide
      productSlidesHtml += `
          <div class="swiper-slide recently-viewed-product-slide">
            <div class="recently-viewed-product-content"> {# Container für das Produkt-Item #}
              <a href="/products/${product.handle}" class="recently-viewed-product-link">
                ${
                  product.featured_image
                    ? `<img class="recently-viewed-product-image" src="<span class="math-inline">\{product\.featured\_image\}"
alt\="</span>{product.title || 'Produktbild'}"
                        loading="lazy">`
                    : '<div class="recently-viewed-product-image placeholder-image"></div>'
                }
                <h3 class="recently-viewed-product-title">${product.title || 'Unbenanntes Produkt'}</h3>
                ${
                  product.price !== undefined && product.currency
                    ? `<p class="recently-viewed-product-price">${(product.price / 100).toFixed(2)} ${
                        product.currency
                      }</p>`
                    : ''
                }
              </a>
              {# F\u00FCge hier optional einen "Jetzt kaufen" Button oder \u00C4hnliches hinzu #}
              {# <button class="button">Jetzt kaufen</button> #}
            </div>
          </div>
        `;
    });

    // Füge die generierten Slides in den Swiper Wrapper ein
    swiperWrapper.innerHTML = productSlidesHtml;

    console.log('[RVP] renderProducts: Produktdaten als Swiper Slides in Wrapper eingefügt.');

    // --- INITIALISIERE SWIPER ---
    // Suche das Haupt-Swiper-Element im DOM deines Custom Elements
    const swiperElement = this.querySelector('.recently-viewed-products-swiper');

    if (swiperElement && typeof Swiper !== 'undefined') {
      // Prüfe, ob Swiper JS geladen ist
      console.log('[RVP] renderProducts: Swiper Element gefunden, initialisiere Swiper.');
      // Initialisiere Swiper mit Optionen
      // Passe die Optionen an, um das Verhalten deines Karussells zu steuern!
      const mySwiper = new Swiper(swiperElement, {
        // Beispiel-Optionen (passe diese an deine Bedürfnisse an!)
        slidesPerView: 'auto', // Zeigt so viele Slides wie reinpassen
        spaceBetween: 20, // Abstand zwischen den Slides (in px)
        loop: false, // Endloses Scrollen (optional)
        navigation: {
          // Navigation Pfeile
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        pagination: {
          // Pagination Dots
          el: '.swiper-pagination',
          clickable: true, // Macht die Dots klickbar
        },
        // Füge hier weitere Swiper Optionen hinzu (Responsivität, etc.)
        // Siehe Swiper API Dokumentation f\u00FCr alle Optionen: https://swiperjs.com/api/
        // Responsive Breakpoints sind wichtig f\u00FCr verschiedene Ger\u00E4tegr\u00F6\u00DFen
        breakpoints: {
          // Beispiel f\u00FCr Responsivit\u00E4t:
          640: {
            // > 640px Breite
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            // > 768px Breite
            slidesPerView: 3,
            spaceBetween: 40,
          },
          1024: {
            // > 1024px Breite
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
      this.innerHTML = '<p>Fehler: Karussell-Bibliothek konnte nicht geladen werden.</p>'; // Fehlermeldung im UI
    } else {
      console.error(
        '[RVP] renderProducts: Swiper Container-Element (.recently-viewed-products-swiper) im DOM nicht gefunden!'
      );
      this.innerHTML = '<p>Fehler beim Erstellen des Karussells.</p>'; // Zeige Fehlermeldung im UI
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
