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
    // TODO: Implementiere das Rendern der Produkte und die Karussell-Logik hier

    if (products.length > 0) {
      // Entferne vorherigen Inhalt (z.B. Platzhalter oder Lade-Indikator)
      this.innerHTML = '';

      // Hier erstellst du das HTML-Markup für das Karussell und jedes Produkt
      // Die Struktur hängt von deiner gewählten Karussell-Bibliothek ab!
      let carouselHtml = '<div class="recently-viewed-products-carousel-container">'; // Ein Container für das Karussell

      // Beispielhafte Produkt-Rendering-Schleife (Passe dies an deine Bedürfnisse an!)
      products.forEach((product) => {
        // Erstelle das HTML für ein einzelnes Produkt im Karussell-Item
        carouselHtml += `
          <div class="recently-viewed-product-item">
            <a href="/products/${product.handle}">
              ${
                product.featured_image
                  ? `<img src="${product.featured_image}" alt="${product.title}" loading="lazy" width="150" height="150">`
                  : '<div class="placeholder-image"></div>'
              }
              <h3>${product.title}</h3>
              <p>${
                product.price / 100
              } {{ shop.money_format }}</p> {# Preis ist in Cent, shop.money_format ist ein Liquid Tag, das hier nicht direkt geht, muss per JS formatiert oder von anderer Stelle geholt werden #}
              {# Bessere Preisformatierung in JS: product.price / 100 + ' ' + product.currency #}
              ${product.price / 100} ${product.currency}
            </a>
          </div>
        `;
      });

      carouselHtml += '</div>'; // Schließe den Karussell-Container

      this.innerHTML = carouselHtml; // Füge das generierte HTML in das Custom Element ein

      console.log('[RVP] renderProducts: Produktdaten gerendert.');

      // TODO: Initialisiere HIER deine gewählte Karussell-Bibliothek
      // Suche das Hauptelement des Karussells im DOM deines Custom Elements
      const carouselElement = this.querySelector('.recently-viewed-products-carousel-container'); // Beispiel Selector

      if (carouselElement) {
        console.log('[RVP] renderProducts: Karussell-Element gefunden, versuche zu initialisieren.');
        // Dein Code zur Initialisierung der Karussell-Bibliothek kommt hier hin.
        // Beispiel (hypothetisch für Swiper):
        // new Swiper(carouselElement, {
        //    // Swiper Konfiguration hier
        //    slidesPerView: 'auto',
        //    spaceBetween: 20,
        //    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        //    pagination: { el: '.swiper-pagination', clickable: true },
        // });
        console.log('[RVP] renderProducts: TODO: Karussell-Initialisierungscode fehlt.');
      } else {
        console.error('[RVP] renderProducts: Karussell-Element im DOM nicht gefunden!');
      }
    } else {
      this.innerHTML = '<p>Keine gültigen Produkte zum Anzeigen gefunden.</p>';
      console.log('[RVP] renderProducts: Keine gültigen Produkte zum Anzeigen gefunden.');
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
