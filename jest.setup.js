// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill web APIs for jsdom (required by Firebase, streaming libs, etc.)
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') })
  )
}
if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.ok = this.status >= 200 && this.status < 300
    }
    json() { return Promise.resolve({}) }
    text() { return Promise.resolve('') }
  }
}
if (!globalThis.Request) {
  globalThis.Request = class Request {
    constructor(url, init) {
      this.url = url
      this.method = init?.method || 'GET'
    }
  }
}
if (!globalThis.Headers) {
  globalThis.Headers = class Headers {
    constructor() { this._h = {} }
    set(k, v) { this._h[k] = v }
    get(k) { return this._h[k] }
  }
}
if (!globalThis.TransformStream) {
  globalThis.TransformStream = class TransformStream {
    constructor() {
      this.readable = {}
      this.writable = {}
    }
  }
}

// Mock Firebase (prevents ReferenceError from firebase/auth in jsdom)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}))
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, cb) => { cb(null); return jest.fn() }),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
}))

// Mock next-intl
jest.mock('next-intl', () => {
  const tFn = (key) => key
  tFn.raw = (key) => []
  tFn.rich = (key) => key
  tFn.markup = (key) => key
  tFn.has = (key) => false
  return {
    useTranslations: () => tFn,
    useLocale: () => 'en',
    useMessages: () => ({}),
    useFormatter: () => ({ number: (v) => String(v), dateTime: (v) => String(v) }),
    NextIntlClientProvider: ({ children }) => children,
  }
})

// Mock next-intl/navigation (used by @/i18n/routing)
jest.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ children, href }) => <a href={href}>{children}</a>,
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    usePathname: () => '/',
    redirect: jest.fn(),
  }),
}))

// Mock @/i18n/routing
jest.mock('@/i18n/routing', () => ({
  Link: ({ children, href }) => <a href={href}>{children}</a>,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  redirect: jest.fn(),
  routing: {
    locales: ['en', 'ar', 'es', 'fr', 'de'],
    defaultLocale: 'en',
  },
}))

// Mock WishlistContext
jest.mock('@/contexts/WishlistContext', () => ({
  WishlistProvider: ({ children }) => children,
  useWishlist: () => ({
    wishlist: [],
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    isWishlisted: jest.fn(() => false),
    toggleWishlist: jest.fn(),
  }),
}))

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    signup: jest.fn(),
  }),
}))

// Mock SettingsContext + useSettings hook
jest.mock('@/contexts/SettingsContext', () => {
  const React = require('react')
  const mockValue = {
    selectedCurrency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    selectedLanguage: { code: 'en', name: 'English', nativeName: 'English' },
    exchangeRates: { USD: 1 },
    isLoading: false,
    formatPrice: (v) => `$${Number(v).toFixed(2)}`,
    formatNumber: (v) => String(v),
    formatDate: (v) => String(v),
    formatPriceRange: (min, max) => `$${min} - $${max}`,
    formatDiscount: (v) => `${v}%`,
    formatSavings: (v) => `$${v}`,
    getCurrencySymbol: () => '$',
    convertPrice: (v) => v,
    t: (key) => key,
    setCurrency: jest.fn(),
    setLanguage: jest.fn(),
  }
  const SettingsContext = React.createContext(mockValue)
  return {
    __esModule: true,
    SettingsContext,
    SettingsProvider: ({ children }) => React.createElement(SettingsContext.Provider, { value: mockValue }, children),
  }
})

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    selectedCurrency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    selectedLanguage: { code: 'en', name: 'English', nativeName: 'English' },
    exchangeRates: { USD: 1 },
    isLoading: false,
    formatPrice: (v) => `$${Number(v).toFixed(2)}`,
    formatNumber: (v) => String(v),
    formatDate: (v) => String(v),
    formatPriceRange: (min, max) => `$${min} - $${max}`,
    formatDiscount: (v) => `${v}%`,
    formatSavings: (v) => `$${v}`,
    getCurrencySymbol: () => '$',
    convertPrice: (v) => v,
    t: (key) => key,
    setCurrency: jest.fn(),
    setLanguage: jest.fn(),
  }),
  usePriceFormatter: () => (v) => `$${Number(v).toFixed(2)}`,
  useNumberFormatter: () => (v) => String(v),
  useDateFormatter: () => (v) => String(v),
  useTranslation: () => ({ t: (key) => key }),
  usePriceRangeFormatter: () => (min, max) => `$${min} - $${max}`,
  useDiscountFormatter: () => (v) => `${v}%`,
  useSavingsFormatter: () => (v) => `$${v}`,
  useCurrencySymbol: () => () => '$',
  usePriceConverter: () => (v) => v,
  useBookingTranslations: () => ({}),
  useUITranslations: () => ({}),
  useCurrencyInfo: () => ({ currency: { code: 'USD', symbol: '$' }, symbol: '$', code: 'USD' }),
  useLanguageInfo: () => ({ language: { code: 'en' }, code: 'en', name: 'English' }),
}))

// Mock CartContext + useCart
jest.mock('@/contexts/CartContext', () => {
  const React = require('react')
  const mockValue = {
    cart: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    isCartOpen: false,
    openCart: jest.fn(),
    closeCart: jest.fn(),
    totalItems: 0,
    isLoading: false,
  }
  const CartContext = React.createContext(mockValue)
  return {
    __esModule: true,
    CartContext,
    CartProvider: ({ children }) => React.createElement(CartContext.Provider, { value: mockValue }, children),
  }
})

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cart: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    isCartOpen: false,
    openCart: jest.fn(),
    closeCart: jest.fn(),
    totalItems: 0,
    isLoading: false,
  }),
}))

// Mock NavDataContext
jest.mock('@/contexts/NavDataContext', () => ({
  NavDataProvider: ({ children }) => children,
  useNavData: () => ({
    destinations: [],
    categories: [],
  }),
}))

// Mock react-markdown (ESM-only package)
jest.mock('react-markdown', () => {
  return ({ children }) => <div data-testid="react-markdown">{children}</div>
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}
