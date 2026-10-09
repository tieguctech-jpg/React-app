
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

// ============================================================================
// 1. DESIGN TOKENS
// ============================================================================
const C = {
  cream: '#F8F5F0',
  white: '#FFFFFF',
  gold: '#C9A227',
  goldLight: '#E5C76B',
  goldDeep: '#9C7A16',
  charcoal: '#1F1F1F',
  charcoal2: '#3A3A3A',
  muted: '#8A8578',
  muted2: '#B4AEA3',
  line: 'rgba(31,31,31,0.08)',
  lineStrong: 'rgba(31,31,31,0.14)',
  danger: '#B4453C',
  success: '#3F7D58',
  soft: '#EDE8DF',
};

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// ============================================================================
// 2. API CONFIGURATION  —  single place to connect a real backend later
// ============================================================================
const API_CONFIG = {
  baseUrl: '',             // ← no default server URL. Set deployed HTTPS backend here.
  timeoutMs: 60000,
};

const ENDPOINTS = {
  // Auth
  authSignIn: null,
  authSignUp: null,
  authSignOut: null,
  authGoogle: null,
  authForgot: null,
  authReset: null,
  authVerifyEmail: null,
  authResendCode: null,
  // User
  userProfile: null,
  userUpdate: null,
  userSettings: null,
  // Image
  imageGenerate: null,
  imageEdit: null,
  imageEnhance: null,
  imageRemoveBg: null,
  imageReplaceBg: null,
  imageUpscale: null,
  imageUpload: null,
  // Gallery
  galleryList: null,
  gallerySave: null,
  galleryDelete: null,
  // Projects
  projectsList: null,
  projectDetail: null,
  projectRename: null,
  projectDelete: null,
  historyList: null,
  // Stars / payments
  starsBalance: null,
  starsPackages: null,
  paymentsInitiate: null,
  paymentsVerify: null,
  paymentsHistory: null,
  // Admin
  adminSignIn: null,
  adminOverview: null,
  adminUsers: null,
  adminUserUpdate: null,
  adminStarsAdjust: null,
  adminProviders: null,
  adminProviderTest: null,
  adminPaymentConfig: null,
  adminPricing: null,
  adminGenerations: null,
  adminTransactions: null,
  adminAnalytics: null,
  adminLogs: null,
  adminSettings: null,
};

const backendConfigured = () =>
  typeof API_CONFIG.baseUrl === 'string' && API_CONFIG.baseUrl.trim().length > 0;

class BackendRequiredError extends Error {
  constructor(feature) {
    super('Backend connection required');
    this.name = 'BackendRequiredError';
    this.code = 'BACKEND_REQUIRED';
    this.feature = feature || null;
  }
}

const resolveUrl = (key) => {
  if (!backendConfigured()) throw new BackendRequiredError(key);
  const path = ENDPOINTS[key];
  if (!path) throw new BackendRequiredError(key);
  return API_CONFIG.baseUrl.replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
};

const apiRequest = async (key, { method = 'GET', body } = {}) => {
  const url = resolveUrl(key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error((data && (data.message || data.error)) || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
};

const Services = {
  auth: {
    signIn: (p) => apiRequest('authSignIn', { method: 'POST', body: p }),
    signUp: (p) => apiRequest('authSignUp', { method: 'POST', body: p }),
    signOut: () => apiRequest('authSignOut', { method: 'POST' }),
    signInWithGoogle: (p) => apiRequest('authGoogle', { method: 'POST', body: p || {} }),
    forgotPassword: (p) => apiRequest('authForgot', { method: 'POST', body: p }),
    resetPassword: (p) => apiRequest('authReset', { method: 'POST', body: p }),
    verifyEmail: (p) => apiRequest('authVerifyEmail', { method: 'POST', body: p }),
    resendCode: (p) => apiRequest('authResendCode', { method: 'POST', body: p }),
  },
  user: {
    getProfile: () => apiRequest('userProfile'),
    update: (p) => apiRequest('userUpdate', { method: 'PATCH', body: p }),
    getSettings: () => apiRequest('userSettings'),
    saveSettings: (p) => apiRequest('userSettings', { method: 'PATCH', body: p }),
  },
  images: {
    generate: (p) => apiRequest('imageGenerate', { method: 'POST', body: p }),
    edit: (p) => apiRequest('imageEdit', { method: 'POST', body: p }),
    enhance: (p) => apiRequest('imageEnhance', { method: 'POST', body: p }),
    removeBackground: (p) => apiRequest('imageRemoveBg', { method: 'POST', body: p }),
    replaceBackground: (p) => apiRequest('imageReplaceBg', { method: 'POST', body: p }),
    upscale: (p) => apiRequest('imageUpscale', { method: 'POST', body: p }),
    upload: (fd) => apiRequest('imageUpload', { method: 'POST', body: fd }),
  },
  gallery: {
    list: (p) => apiRequest('galleryList', { method: 'POST', body: p }),
    save: (p) => apiRequest('gallerySave', { method: 'POST', body: p }),
    remove: (p) => apiRequest('galleryDelete', { method: 'POST', body: p }),
  },
  projects: {
    list: (p) => apiRequest('projectsList', { method: 'POST', body: p }),
    detail: (p) => apiRequest('projectDetail', { method: 'POST', body: p }),
    rename: (p) => apiRequest('projectRename', { method: 'POST', body: p }),
    remove: (p) => apiRequest('projectDelete', { method: 'POST', body: p }),
  },
  history: { list: (p) => apiRequest('historyList', { method: 'POST', body: p }) },
  stars: {
    balance: () => apiRequest('starsBalance'),
    packages: () => apiRequest('starsPackages'),
  },
  payments: {
    initiate: (p) => apiRequest('paymentsInitiate', { method: 'POST', body: p }),
    verify: (p) => apiRequest('paymentsVerify', { method: 'POST', body: p }),
    history: (p) => apiRequest('paymentsHistory', { method: 'POST', body: p }),
  },
  admin: {
    signIn: (p) => apiRequest('adminSignIn', { method: 'POST', body: p }),
    overview: () => apiRequest('adminOverview'),
    users: (p) => apiRequest('adminUsers', { method: 'POST', body: p }),
    updateUser: (p) => apiRequest('adminUserUpdate', { method: 'POST', body: p }),
    adjustStars: (p) => apiRequest('adminStarsAdjust', { method: 'POST', body: p }),
    providers: () => apiRequest('adminProviders'),
    saveProvider: (p) => apiRequest('adminProviders', { method: 'POST', body: p }),
    testProvider: (p) => apiRequest('adminProviderTest', { method: 'POST', body: p }),
    paymentConfig: (p) => apiRequest('adminPaymentConfig', { method: 'POST', body: p }),
    pricing: (p) => apiRequest('adminPricing', { method: 'POST', body: p }),
    generations: (p) => apiRequest('adminGenerations', { method: 'POST', body: p }),
    transactions: (p) => apiRequest('adminTransactions', { method: 'POST', body: p }),
    analytics: (p) => apiRequest('adminAnalytics', { method: 'POST', body: p }),
    logs: (p) => apiRequest('adminLogs', { method: 'POST', body: p }),
    settings: (p) => apiRequest('adminSettings', { method: 'POST', body: p }),
  },
};

// ============================================================================
// 3. UTILITIES
// ============================================================================
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
const fmtNum = (n) =>
  n === null || n === undefined || isNaN(n) ? '—' : Number(n).toLocaleString('en-US');
const fmtMoney = (n, cur = 'USD') => {
  const sym = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', GHS: '₵', ZAR: 'R', KES: 'KSh' }[cur] || '';
  return sym + Number(n || 0).toFixed(2);
};
const timeAgo = (ts) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  return new Date(ts).toLocaleDateString();
};
const initials = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
const isStrongPassword = (v) =>
  typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

// The single backend-required alert used across the app
const backendRequired = (feature) => {
  const map = {
    generate: 'Image generation',
    edit: 'Image editing',
    upload: 'Image upload',
    auth: 'Authentication',
    payment: 'Payments',
    gallery: 'Gallery storage',
    projects: 'Projects',
    admin: 'Administration',
    profile: 'Profile',
    stars: 'Star balance',
  };
  const label = map[feature] || 'This action';
  Alert.alert(
    'Backend connection required',
    `${label} needs a live server. No backend is connected in this build, so nothing was sent, saved or charged.`,
    [{ text: 'Understood' }]
  );
};

// ============================================================================
// 4. ICONS (SVG)
// ============================================================================
const ICONS = {
  home: ['M3.2 10.6 12 3.4l8.8 7.2', 'M5.4 9.6V20a1 1 0 0 0 1 1h4v-6.2h3.2V21h4a1 1 0 0 0 1-1V9.6'],
  sparkle: ['M12 3.2 13.7 9l5.8 1.7-5.8 1.7L12 18.2l-1.7-5.8L4.5 10.7 10.3 9z', 'M18.4 3.6l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z'],
  folder: ['M3.5 7.6a2 2 0 0 1 2-2h3.4l2 2.4h7.6a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z'],
  image: ['M3.4 4.6h17.2a2.4 2.4 0 0 1 2.4 2.4v9.6a2.4 2.4 0 0 1-2.4 2.4H3.4A2.4 2.4 0 0 1 1 16.6V7a2.4 2.4 0 0 1 2.4-2.4z', 'M4.4 17.6 9.2 13l3.4 3.1 3-2.6 4.6 4.1'],
  user: ['M12 4.8a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z', 'M4.8 20.2a7.2 7.2 0 0 1 14.4 0'],
  plus: ['M12 5.2v13.6M5.2 12h13.6'],
  arrowLeft: ['M15.4 5 8.6 12l6.8 7'],
  arrowRight: ['M8.6 5l6.8 7-6.8 7'],
  chevron: ['M9 6l6 6-6 6'],
  chevronDown: ['M6 9.5l6 6 6-6'],
  close: ['M6 6l12 12M18 6L6 18'],
  check: ['M4.8 12.6 9.6 17.4 19.2 6.8'],
  send: ['M4.6 11.8 19.6 4.8 13 19.6l-2.4-6.1z', 'M10.6 13.5 19.6 4.8'],
  camera: ['M4.2 8.6a2 2 0 0 1 2-2h1.5l1.3-2h6l1.3 2h1.5a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2z'],
  upload: ['M12 16V4.8', 'm7.6 9 4.4-4.4L16.4 9', 'M4.8 16v2.6a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6V16'],
  download: ['M12 4.8V16', 'm7.6 11.6 4.4 4.4 4.4-4.4', 'M4.8 16v2.6a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6V16'],
  share: ['M17.4 3.8a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z', 'M6.6 9.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z', 'M17.4 15.4a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z', 'm8.7 10.7 6.6-3.4M8.7 13.3l6.6 3.4'],
  trash: ['M4.6 7.2h14.8', 'M9.4 7.2V5.4a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.8', 'M6.4 7.2 7.3 19a1.4 1.4 0 0 0 1.4 1.3h6.6a1.4 1.4 0 0 0 1.4-1.3l.9-11.8'],
  edit: ['M15.4 4.6 19.4 8.6 8.6 19.4H4.6v-4z', 'm13.6 6.4 4 4'],
  wand: ['M5 19 17.4 6.6', 'M15 4.4l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z', 'M5.4 5.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6L3.2 7.6l1.6-.6z'],
  layers: ['M12 3.6 20.4 8 12 12.4 3.6 8z', 'm3.6 12.6 8.4 4.4 8.4-4.4', 'm3.6 16.6 8.4 4.4 8.4-4.4'],
  crop: ['M6.4 2.6v15h15', 'M2.6 6.4h15v15'],
  sliders: ['M4 7.2h9M17.4 7.2h2.6', 'M4 16.8h4.6M13 16.8h7'],
  bolt: ['M13.2 2.8 5.4 13.4h5.2l-.8 7.8 7.8-10.6h-5.2z'],
  crown: ['M3.4 7.6 7 12.4l5-7.2 5 7.2 3.6-4.8-1.6 11.2H5z'],
  wallet: ['M3.4 6.2h17.2a2.4 2.4 0 0 1 2.4 2.4v7.8a2.4 2.4 0 0 1-2.4 2.4H3.4A2.4 2.4 0 0 1 1 16.4V8.6A2.4 2.4 0 0 1 3.4 6.2z', 'M3.4 10.4h17.2'],
  card: ['M3 5.4h18a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H3A2.4 2.4 0 0 1 .6 16.2V7.8A2.4 2.4 0 0 1 3 5.4z', 'M3 10h18', 'M6.4 14.6h3'],
  clock: ['M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z', 'M12 7.4V12l3 2'],
  history: ['M3.6 12a8.4 8.4 0 1 0 2.6-6.1', 'M3.4 4.4v4.2h4.2', 'M12 8v4.4l3 1.8'],
  search: ['M11 4.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 0 1 0-12.8z', 'm16 16 4.4 4.4'],
  filter: ['M3.6 5.6h16.8', 'M6.6 12h10.8', 'M9.6 18.4h4.8'],
  grid: ['M3.6 3.6h7v7h-7z', 'M13.4 3.6h7v7h-7z', 'M3.6 13.4h7v7h-7z', 'M13.4 13.4h7v7h-7z'],
  list: ['M4 6.6h16M4 12h16M4 17.4h16'],
  settings: ['M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', 'M19.2 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3.4a1.9 1.9 0 1 1 0-3.8h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1A1.6 1.6 0 0 0 10.4 3.4V3.2a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.5 1z'],
  logout: ['M14.6 4.6H6.4a2 2 0 0 0-2 2v10.8a2 2 0 0 0 2 2h8.2', 'M16.4 8.4 20 12l-3.6 3.6', 'M20 12h-9'],
  shield: ['M12 3.2 5 6v5.6c0 4.2 2.9 7.9 7 9.2 4.1-1.3 7-5 7-9.2V6z', 'm9.2 12 2 2 3.6-3.8'],
  lock: ['M4.6 10.4h14.8a2.4 2.4 0 0 1 2.4 2.4v7.6a2.4 2.4 0 0 1-2.4 2.4H4.6A2.4 2.4 0 0 1 2.2 20.4v-7.6A2.4 2.4 0 0 1 4.6 10.4z', 'M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6'],
  mail: ['M3 5.4h18a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H3a2.4 2.4 0 0 1-2.4-2.4V7.8A2.4 2.4 0 0 1 3 5.4z', 'm3.8 7 8.2 6 8.2-6'],
  eye: ['M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z', 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  eyeOff: ['M4 4l16 16', 'M9.6 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1.1', 'M6.3 6.6C3.9 8.3 2.6 12 2.6 12s3.4 6.2 9.4 6.2c1.7 0 3.2-.5 4.5-1.3', 'M19.1 15c1.4-1.6 2.3-3 2.3-3S18 5.8 12 5.8c-.7 0-1.3.1-1.9.2'],
  bell: ['M18 8.6a6 6 0 1 0-12 0c0 6.4-2.4 8.2-2.4 8.2h16.8S18 15 18 8.6z', 'M13.7 20.4a2 2 0 0 1-3.4 0'],
  moon: ['M20.4 14.2A8.4 8.4 0 1 1 9.8 3.6a6.8 6.8 0 1 0 10.6 10.6z'],
  sun: ['M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4'],
  help: ['M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z', 'M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2.5-2.5 2.5'],
  doc: ['M6.4 3.4h7.2l4.6 4.6v12a1.4 1.4 0 0 1-1.4 1.4H6.4A1.4 1.4 0 0 1 5 20V4.8a1.4 1.4 0 0 1 1.4-1.4z', 'M13.6 3.4V8H18'],
  refresh: ['M20 11.6A8 8 0 1 0 18.4 17', 'M20 5.6v6h-6'],
  undo: ['M4 9.4h9.4a5.6 5.6 0 0 1 0 11.2H8', 'M7.6 5.4 3.4 9.4l4.2 4'],
  redo: ['M20 9.4h-9.4a5.6 5.6 0 0 0 0 11.2H16', 'm16.4 5.4 4.2 4-4.2 4'],
  expand: ['M9 3.6H3.6V9', 'M15 3.6h5.4V9', 'M15 20.4h5.4V15', 'M9 20.4H3.6V15'],
  building: ['M4.6 20.4V5.2a1.6 1.6 0 0 1 1.6-1.6h7.6a1.6 1.6 0 0 1 1.6 1.6v15.2', 'M15.4 9.6h3.4a1.6 1.6 0 0 1 1.6 1.6v9.2', 'M3 20.4h18', 'M8 8h3M8 12h3M8 16h3'],
  cpu: ['M7.4 7.4h9.2a2 2 0 0 1 2 2v4.2a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2v-4.2a2 2 0 0 1 2-2z', 'M10 3.4v4M14 3.4v4M10 16.6v4M14 16.6v4M3.4 10h4M3.4 14h4M16.6 10h4M16.6 14h4'],
  activity: ['M3 12h4l2.4-6.4L13 18.4l2.4-6.4H21'],
  users: ['M9.4 5a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z', 'M2.8 19.8a6.6 6.6 0 0 1 13.2 0', 'M16.6 5.4a3.4 3.4 0 0 1 0 6.6', 'M17.6 14.2a6.6 6.6 0 0 1 3.6 5.6'],
  chart: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
  tag: ['M11.6 3.6H20v8.4l-8.8 8.8a1.6 1.6 0 0 1-2.3 0L3.6 15a1.6 1.6 0 0 1 0-2.3z'],
  key: ['M8 12a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z', 'm10.4 13 8-8', 'm15.6 7.8 2 2', 'm17.8 5.6 2 2'],
  alert: ['M12 3.6 21.2 20H2.8z', 'M12 9.6v4.6'],
  info: ['M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z', 'M12 11v5.4'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  minus: ['M5.2 12h13.6'],
};

const Icon = ({ name, size = 22, color = C.charcoal, strokeWidth = 1.7, style }) => {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
};

const StarIcon = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="tiegStar" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#E5C76B" />
        <Stop offset="0.55" stopColor="#C9A227" />
        <Stop offset="1" stopColor="#9C7A16" />
      </LinearGradient>
    </Defs>
    <Path
      d="M12 2.4l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.46 6.1 20.56l1.13-6.57L2.45 9.34l6.6-.96z"
      fill="url(#tiegStar)"
      stroke="#9C7A16"
      strokeWidth={0.7}
      strokeLinejoin="round"
    />
  </Svg>
);

const StarInline = ({ amount, size = 14, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
    <StarIcon size={size} />
    <Text style={{ fontWeight: '600', color: C.goldDeep, fontVariant: ['tabular-nums'] }}>
      {fmtNum(amount)}
    </Text>
  </View>
);

// ============================================================================
// 5. SAMPLE ART (procedurally generated, clearly labelled)
// ============================================================================
const ART_PALETTES = [
  ['#F7EFE0', '#E5C76B', '#C9A227', '#7C6320'],
  ['#E9EEF2', '#9FB4C7', '#5B7794', '#2F3E4F'],
  ['#F3E9E4', '#E0A98F', '#B9694A', '#5A3225'],
  ['#EDF1EA', '#A9C0A0', '#5F8256', '#2E4327'],
  ['#F1ECF6', '#C0AEDA', '#7E63A8', '#3B2C55'],
  ['#FBF0E4', '#F0C48A', '#D08B3E', '#6B4318'],
  ['#ECECEC', '#BFBFBF', '#7A7A7A', '#2B2B2B'],
  ['#E8F1F2', '#8FD0D6', '#3E9AA6', '#1D4E56'],
  ['#F5EDE7', '#D8B49A', '#A97452', '#4E3324'],
  ['#EDEBE6', '#C9A227', '#3A3A3A', '#1F1F1F'],
];

const SampleArt = ({ seed = 1, size = 200, style, radius = 0 }) => {
  const s = Math.abs(Number(seed) || 1);
  const pal = ART_PALETTES[s % ART_PALETTES.length];
  const circles = useMemo(() => {
    let state = (s * 2654435761) % 4294967296;
    const rnd = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    return Array.from({ length: 7 }).map(() => ({
      cx: rnd() * 200,
      cy: rnd() * 200,
      r: 20 + rnd() * 80,
      fill: pal[1 + Math.floor(rnd() * 3)],
      opacity: 0.14 + rnd() * 0.42,
    }));
  }, [s, pal]);

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id={`bg_${s}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={pal[0]} />
            <Stop offset="1" stopColor={pal[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="200" height="200" fill={`url(#bg_${s})`} />
        {circles.map((c, i) => (
          <Circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} opacity={c.opacity} />
        ))}
        <Rect y={70} width="200" height="6" fill={pal[3]} opacity={0.1} />
        <Rect y={140} width="200" height="4" fill={pal[3]} opacity={0.1} />
      </Svg>
    </View>
  );
};

// ============================================================================
// 6. SHARED COMPONENTS
// ============================================================================
const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: iconName,
  disabled,
  style,
  textStyle,
}) => {
  const base = {
    primary: { backgroundColor: C.gold, borderColor: 'transparent' },
    dark: { backgroundColor: C.charcoal, borderColor: 'transparent' },
    ghost: { backgroundColor: 'rgba(31,31,31,0.05)', borderColor: 'transparent' },
    outline: { backgroundColor: '#fff', borderColor: 'rgba(201,162,39,0.55)' },
    danger: { backgroundColor: 'rgba(180,69,60,0.1)', borderColor: 'transparent' },
  }[variant];
  const textColor =
    variant === 'primary' || variant === 'dark'
      ? '#fff'
      : variant === 'danger'
      ? C.danger
      : variant === 'outline'
      ? C.goldDeep
      : C.charcoal;
  const paddings = {
    sm: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
    md: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 22, borderRadius: 18 },
  }[size];
  const fontSizes = { sm: 13, md: 14.5, lg: 15.5 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: 1.5,
          ...paddings,
          ...base,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {iconName ? <Icon name={iconName} size={fontSizes + 2} color={textColor} /> : null}
      <Text style={[{ color: textColor, fontWeight: '600', fontSize: fontSizes }, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const Card = ({ children, style, gold }) => (
  <View
    style={[
      {
        backgroundColor: gold ? '#FFFDF7' : C.white,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: gold ? 'rgba(201,162,39,0.28)' : C.line,
        shadowColor: '#1F1F1F',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
        elevation: 2,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const Chip = ({ label, active, onPress, size = 'md', style, icon: iconName }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      {
        paddingVertical: size === 'sm' ? 6 : 8,
        paddingHorizontal: size === 'sm' ? 11 : 14,
        borderRadius: 999,
        backgroundColor: active ? C.gold : '#fff',
        borderWidth: 1,
        borderColor: active ? 'transparent' : C.lineStrong,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      },
      style,
    ]}
  >
    {iconName ? (
      <Icon name={iconName} size={size === 'sm' ? 12 : 14} color={active ? '#fff' : C.charcoal2} />
    ) : null}
    <Text
      style={{
        color: active ? '#fff' : C.charcoal2,
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: '500',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const Avatar = ({ name, size = 42, variant = 'gold', style }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: variant === 'gold' ? C.gold : '#C9C3B8',
      },
      style,
    ]}
  >
    <Text style={{ color: '#fff', fontWeight: '600', fontSize: size * 0.36 }}>
      {initials(name)}
    </Text>
  </View>
);

const Field = ({ label, children, error, style }) => (
  <View style={[{ gap: 7 }, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    {children}
    {error ? <Text style={{ fontSize: 12, color: C.danger }}>{error}</Text> : null}
  </View>
);

const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  error,
  rightSlot,
  multiline,
  numberOfLines,
  style,
  editable = true,
}) => (
  <Field label={label} error={error}>
    <View style={{ position: 'relative' }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted2}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        style={[
          styles.input,
          multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
          error && { borderColor: C.danger },
          rightSlot && { paddingRight: 52 },
          style,
        ]}
      />
      {rightSlot ? (
        <View style={{ position: 'absolute', right: 6, top: '50%', marginTop: -18 }}>
          {rightSlot}
        </View>
      ) : null}
    </View>
  </Field>
);

const BackBar = ({ title, onBack, rightSlot, navigation }) => (
  <View style={styles.appbar}>
    <TouchableOpacity
      onPress={onBack || (() => navigation && navigation.goBack())}
      style={styles.iconbtn}
      activeOpacity={0.7}
    >
      <Icon name="arrowLeft" size={20} />
    </TouchableOpacity>
    <Text style={[styles.appbarTitle, { textAlign: 'left', marginLeft: 4 }]} numberOfLines={1}>
      {title}
    </Text>
    <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{rightSlot}</View>
  </View>
);

const SectionHead = ({ title, action, onAction }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.h3}>{title}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text style={{ color: C.goldDeep, fontSize: 13, fontWeight: '600' }}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const EmptyState = ({ iconName = 'image', title, body, action }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIco}>
      <Icon name={iconName} size={28} color={C.goldDeep} />
    </View>
    <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{title}</Text>
    {body ? (
      <Text style={{ color: C.muted, fontSize: 13.5, textAlign: 'center', maxWidth: 300 }}>
        {body}
      </Text>
    ) : null}
    {action}
  </View>
);

const PreviewBanner = ({ children }) => (
  <View
    style={{
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: '#FFFCF2',
      borderWidth: 1,
      borderColor: 'rgba(201,162,39,0.32)',
    }}
  >
    <Icon name="info" size={16} color={C.goldDeep} />
    <Text style={{ flex: 1, fontSize: 12.6, color: '#5C4E28', lineHeight: 18 }}>{children}</Text>
  </View>
);

const Status = ({ kind = 'neutral', children }) => {
  const map = {
    ok: { bg: 'rgba(63,125,88,0.12)', fg: C.success },
    warn: { bg: 'rgba(201,162,39,0.15)', fg: C.goldDeep },
    err: { bg: 'rgba(180,69,60,0.12)', fg: C.danger },
    neutral: { bg: 'rgba(31,31,31,0.07)', fg: C.muted },
  }[kind];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: map.bg,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: map.fg }} />
      <Text style={{ fontSize: 11.5, fontWeight: '600', color: map.fg }}>{children}</Text>
    </View>
  );
};

// ============================================================================
// 7. SAMPLE DATA (frontend preview only)
// ============================================================================
const STYLES = ['Realistic', 'Cinematic', 'Photography', 'Digital Art', 'Illustration', 'Architecture', 'Product Photography', 'Fantasy'];
const RATIOS = [
  { id: '1:1', label: '1:1', note: 'Square' },
  { id: '3:2', label: '3:2', note: 'Landscape' },
  { id: '2:3', label: '2:3', note: 'Portrait' },
  { id: '16:9', label: '16:9', note: 'Wide' },
  { id: '9:16', label: '9:16', note: 'Story' },
];
const RESOLUTIONS = [
  { id: '512', label: '512 px', note: 'Draft', cost: 2 },
  { id: '768', label: '768 px', note: 'Standard', cost: 3 },
  { id: '1024', label: '1024 px', note: 'High', cost: 5 },
  { id: '1536', label: '1536 px', note: 'Ultra', cost: 8 },
  { id: '2048', label: '2048 px', note: 'Maximum', cost: 12 },
];
const EDIT_ACTIONS = [
  { id: 'edit', label: 'Edit', icon: 'wand', cost: 4, desc: 'Apply a written instruction to the image' },
  { id: 'enhance', label: 'Enhance', icon: 'sparkle', cost: 2, desc: 'Improve clarity, lighting and detail' },
  { id: 'removeBg', label: 'Remove BG', icon: 'crop', cost: 3, desc: 'Cut the subject out of its background' },
  { id: 'replaceBg', label: 'Replace BG', icon: 'layers', cost: 4, desc: 'Swap the background for a new scene' },
  { id: 'upscale', label: 'Upscale', icon: 'expand', cost: 6, desc: 'Increase resolution without losing quality' },
];

const SAMPLE_PROJECTS = [
  { id: 'prj_1', title: 'Modern Villa Concept', seed: 12, images: 6, style: 'Architecture', updated: '2 days ago', status: 'Draft' },
  { id: 'prj_2', title: 'Luxury Bedroom Set', seed: 4, images: 9, style: 'Realistic', updated: '5 days ago', status: 'Complete' },
  { id: 'prj_3', title: 'Gold Product Campaign', seed: 21, images: 4, style: 'Product Photography', updated: '1 week ago', status: 'In review' },
  { id: 'prj_4', title: 'Fantasy Forest Series', seed: 7, images: 12, style: 'Fantasy', updated: '2 weeks ago', status: 'Complete' },
  { id: 'prj_5', title: 'Editorial Portrait Study', seed: 15, images: 3, style: 'Photography', updated: '3 weeks ago', status: 'Draft' },
];

const GALLERY_CATEGORIES = ['All', 'Architecture', 'Portrait', 'Product', 'Fantasy', 'Nature', 'Abstract'];
const SAMPLE_GALLERY = Array.from({ length: 24 }).map((_, i) => ({
  id: 'img_' + (i + 1),
  title:
    ['Golden Hour Study', 'Marble Interior', 'Studio Product', 'Misty Ridge', 'Editorial Light', 'Abstract Gold', 'Coastal Villa', 'Soft Portrait'][i % 8] +
    ' ' + (Math.floor(i / 8) + 1),
  seed: i * 3 + 2,
  category: GALLERY_CATEGORIES[(i % (GALLERY_CATEGORIES.length - 1)) + 1],
  style: STYLES[i % STYLES.length],
  created: Date.now() - i * 86400000 * 1.4,
  sample: true,
}));

const SAMPLE_USERS = [
  { id: 'u_1', name: 'Amara Okafor', email: 'amara@example.com', joined: '2024-11-02', status: 'Active', stars: 182, generations: 96, spent: 44.94 },
  { id: 'u_2', name: 'Daniel Kim', email: 'daniel@example.com', joined: '2024-11-19', status: 'Active', stars: 64, generations: 41, spent: 17.98 },
  { id: 'u_3', name: 'Lina Mensah', email: 'lina@example.com', joined: '2024-12-04', status: 'Active', stars: 410, generations: 233, spent: 89.97 },
  { id: 'u_4', name: 'Tunde Adeyemi', email: 'tunde@example.com', joined: '2024-12-21', status: 'Suspended', stars: 6, generations: 12, spent: 4.99 },
  { id: 'u_5', name: 'Grace Nwosu', email: 'grace@example.com', joined: '2025-01-05', status: 'Active', stars: 97, generations: 55, spent: 26.97 },
  { id: 'u_6', name: 'Yusuf Bello', email: 'yusuf@example.com', joined: '2025-01-09', status: 'Pending', stars: 0, generations: 0, spent: 0 },
];

const SAMPLE_TRANSACTIONS = [
  { id: 'TX-90231', user: 'Amara O.', email: 'amara@example.com', pkg: 'Studio — 250 Stars', amount: 19.99, cur: 'USD', provider: 'Paystack', status: 'Pending verification', date: '2025-01-14 09:22' },
  { id: 'TX-90230', user: 'Daniel K.', email: 'daniel@example.com', pkg: 'Creator — 100 Stars', amount: 8.99, cur: 'USD', provider: 'Google Play Billing', status: 'Pending verification', date: '2025-01-14 08:10' },
  { id: 'TX-90229', user: 'Lina M.', email: 'lina@example.com', pkg: 'Professional — 500 Stars', amount: 34.99, cur: 'USD', provider: 'Apple In-App Purchase', status: 'Pending verification', date: '2025-01-13 21:48' },
  { id: 'TX-90228', user: 'Tunde A.', email: 'tunde@example.com', pkg: 'Starter — 50 Stars', amount: 4.99, cur: 'USD', provider: 'Paystack', status: 'Pending verification', date: '2025-01-13 17:02' },
  { id: 'TX-90227', user: 'Grace N.', email: 'grace@example.com', pkg: 'Creator — 100 Stars', amount: 8.99, cur: 'USD', provider: 'Custom provider', status: 'Pending verification', date: '2025-01-13 11:35' },
];

const SAMPLE_LOGS = [
  { time: '2025-01-14 09:31', admin: 'admin@tieg', action: 'Updated image generation cost for 2048 px', scope: 'Pricing' },
  { time: '2025-01-14 08:55', admin: 'admin@tieg', action: 'Disabled provider configuration', scope: 'AI Providers' },
  { time: '2025-01-13 22:12', admin: 'ops@tieg', action: 'Adjusted Star balance for Tunde Adeyemi (−20)', scope: 'Users' },
  { time: '2025-01-13 19:40', admin: 'ops@tieg', action: 'Suspended account u_4', scope: 'Users' },
  { time: '2025-01-13 15:03', admin: 'admin@tieg', action: 'Changed payment provider display order', scope: 'Payments' },
  { time: '2025-01-13 09:18', admin: 'admin@tieg', action: 'Signed in to admin dashboard', scope: 'Authentication' },
];

const STAR_PACKAGES = [
  { id: 'starter', name: 'Starter', stars: 50, price: 4.99, cur: 'USD', desc: 'For trying out ideas and quick concepts.', badge: '' },
  { id: 'creator', name: 'Creator', stars: 100, price: 8.99, cur: 'USD', desc: 'Best for regular creators and small projects.', badge: 'Popular' },
  { id: 'studio', name: 'Studio', stars: 250, price: 19.99, cur: 'USD', desc: 'For teams producing consistent content.', badge: 'Best value' },
  { id: 'pro', name: 'Professional', stars: 500, price: 34.99, cur: 'USD', desc: 'High volume generation and editing.', badge: '' },
];

// ============================================================================
// 8. GLOBAL CONTEXT
// ============================================================================
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const AppProvider = ({ children }) => {
  const [user, setUser] = useState({
    name: 'Guest Creator',
    email: 'Not signed in',
    plan: 'Preview',
  });
  const [starBalance, setStarBalance] = useState(0);
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: { generations: true, payments: true, product: false, tips: true },
    reduceMotion: false,
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const value = {
    user,
    setUser,
    starBalance,
    setStarBalance,
    settings,
    setSettings,
    chatMessages,
    setChatMessages,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
};

// ============================================================================
// 9. SPLASH SCREEN
// ============================================================================
const SplashScreen = ({ navigation }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(bar, { toValue: 1, duration: 1500, useNativeDriver: false }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(
        () => navigation.replace('Auth')
      );
    }, 2200);
    return () => clearTimeout(t);
  }, [navigation, opacity, scale, bar]);

  const width = bar.interpolate({ inputRange: [0, 1], outputRange: ['10%', '90%'] });

  return (
    <View style={styles.splash}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.splashLogo}>
          <Icon name="sparkle" size={54} color="#fff" strokeWidth={1.6} />
        </View>
      </Animated.View>
      <Text style={styles.splashName}>TIEG AI CREATIVE STUDIO</Text>
      <Text style={styles.splashSub}>Imagine · Create · Refine</Text>
      <View style={styles.splashBarTrack}>
        <Animated.View style={[styles.splashBarFill, { width }]} />
      </View>
      <Text style={styles.splashTag}>Premium AI Image Studio</Text>
    </View>
  );
};

// ============================================================================
// 10. AUTH SCREENS
// ============================================================================
const WelcomeScreen = ({ navigation }) => (
  <View style={styles.authWrap}>
    <View style={styles.authHero}>
      <View style={styles.authLogo}>
        <Icon name="sparkle" size={44} color="#fff" strokeWidth={1.6} />
      </View>
      <Text style={styles.splashName}>TIEG AI CREATIVE STUDIO</Text>
      <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
        Design, generate and edit stunning images with an AI creative partner built around your ideas.
      </Text>
    </View>
    <View style={{ gap: 10 }}>
      <Button title="Create account" onPress={() => navigation.navigate('SignUp')} size="lg" />
      <Button title="I already have an account" variant="outline" size="lg" onPress={() => navigation.navigate('SignIn')} />
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            'Preview mode',
            'You can explore the full interface without an account. Sign-in and account creation need a connected backend.',
            [{ text: 'OK' }]
          )
        }
        style={{ alignSelf: 'center', marginTop: 6, padding: 8 }}
      >
        <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>Continue as guest</Text>
      </TouchableOpacity>
    </View>
    <Text style={[styles.splashTag, { position: 'relative', bottom: 0, marginTop: 24 }]}>
      Backend connection required for sign-in
    </Text>
  </View>
);

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = () => {
    const errs = {};
    if (!isEmail(email)) errs.email = 'Enter a valid email address';
    if (password.length < 1) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    backendRequired('auth');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <BackBar title="Sign in" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        <Text style={styles.h1}>Welcome back</Text>
        <Text style={[styles.sub, { marginTop: 6 }]}>
          Sign in to access your projects, gallery and Star balance.
        </Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={(v) => setEmail(v)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPwd}
            error={errors.password}
            rightSlot={
              <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={{ padding: 8 }}>
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={18} color={C.muted} />
              </TouchableOpacity>
            }
          />
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={{ alignSelf: 'flex-end', color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <Button title="Sign in" onPress={submit} size="lg" />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => backendRequired('auth')} activeOpacity={0.85} style={styles.oauthBtn}>
            <Svg width={20} height={20} viewBox="0 0 48 48">
              <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6.1C12.3 13.9 17.6 9.5 24 9.5z"/>
              <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9.1h12.7c-.6 3-2.3 5.6-4.8 7.3l7.6 5.9c4.4-4.1 7-10.2 7-17.6z"/>
              <Path fill="#FBBC05" d="M10.4 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C1 16.1 0 19.9 0 23.5s1 7.4 2.6 10.7l7.8-6.1z"/>
              <Path fill="#34A853" d="M24 47c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.6 2.3-6.4 0-11.7-4.4-13.6-10.3l-7.8 6.1C6.5 41.1 14.6 47 24 47z"/>
            </Svg>
            <Text style={{ fontWeight: '600', fontSize: 14 }}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 }}>
            <Text style={{ color: C.muted }}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={{ color: C.goldDeep, fontWeight: '600' }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = 'Enter your full name';
    if (!isEmail(email)) errs.email = 'Enter a valid email address';
    if (!isStrongPassword(password)) errs.password = 'Min 8 characters with letters and numbers';
    if (confirm !== password) errs.confirm = 'Passwords do not match';
    if (!agree) errs.agree = 'Please accept the Terms and Privacy Policy';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    backendRequired('auth');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <BackBar title="Create account" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        <Text style={styles.h1}>Create your studio</Text>
        <Text style={[styles.sub, { marginTop: 6 }]}>
          A free workspace for generating and editing images with AI.
        </Text>

        <View style={{ marginTop: 22, gap: 14 }}>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            error={errors.name}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            secureTextEntry={!showPwd}
            error={errors.password}
            rightSlot={
              <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={{ padding: 8 }}>
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={18} color={C.muted} />
              </TouchableOpacity>
            }
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            secureTextEntry
            error={errors.confirm}
          />

          <TouchableOpacity onPress={() => setAgree((v) => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: agree ? C.gold : C.lineStrong,
                backgroundColor: agree ? C.gold : '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {agree ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: C.charcoal2, lineHeight: 19 }}>
              I agree to the <Text style={{ color: C.goldDeep, fontWeight: '600' }}>Terms of Service</Text> and{' '}
              <Text style={{ color: C.goldDeep, fontWeight: '600' }}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>
          {errors.agree ? <Text style={{ fontSize: 12, color: C.danger }}>{errors.agree}</Text> : null}

          <Button title="Create account" size="lg" onPress={submit} />

          <TouchableOpacity onPress={() => backendRequired('auth')} activeOpacity={0.85} style={styles.oauthBtn}>
            <Svg width={20} height={20} viewBox="0 0 48 48">
              <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6.1C12.3 13.9 17.6 9.5 24 9.5z"/>
              <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9.1h12.7c-.6 3-2.3 5.6-4.8 7.3l7.6 5.9c4.4-4.1 7-10.2 7-17.6z"/>
              <Path fill="#FBBC05" d="M10.4 28.1c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C1 16.1 0 19.9 0 23.5s1 7.4 2.6 10.7l7.8-6.1z"/>
              <Path fill="#34A853" d="M24 47c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.6 2.3-6.4 0-11.7-4.4-13.6-10.3l-7.8 6.1C6.5 41.1 14.6 47 24 47z"/>
            </Svg>
            <Text style={{ fontWeight: '600', fontSize: 14 }}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 }}>
            <Text style={{ color: C.muted }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={{ color: C.goldDeep, fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!isEmail(email)) return setErr('Enter a valid email address');
    setErr('');
    backendRequired('auth');
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackBar title="Forgot password" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <Text style={styles.h1}>Reset your password</Text>
        <Text style={[styles.sub, { marginTop: 6 }]}>
          Enter the email linked to your account. We'll send a secure code to reset your password.
        </Text>
        <View style={{ marginTop: 22, gap: 14 }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            error={err}
          />
          <Button title="Send reset code" size="lg" onPress={submit} />
          <Text style={{ color: C.muted, fontSize: 12.5, textAlign: 'center', marginTop: 6 }}>
            Email delivery requires a connected backend.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const ResetPasswordScreen = ({ navigation }) => {
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const submit = () => {
    const errs = {};
    if (code.trim().length < 4) errs.code = 'Enter the code we sent you';
    if (!isStrongPassword(pwd)) errs.pwd = 'Min 8 characters with letters and numbers';
    if (confirm !== pwd) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    backendRequired('auth');
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackBar title="Reset password" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <Text style={styles.h1}>Set a new password</Text>
        <Text style={[styles.sub, { marginTop: 6 }]}>
          Enter the reset code and choose a new password for your account.
        </Text>
        <View style={{ marginTop: 22, gap: 14 }}>
          <TextField label="Reset code" value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="number-pad" error={errors.code} />
          <TextField label="New password" value={pwd} onChangeText={setPwd} placeholder="Min 8 characters" secureTextEntry error={errors.pwd} />
          <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} placeholder="Repeat password" secureTextEntry error={errors.confirm} />
          <Button title="Update password" size="lg" onPress={submit} />
        </View>
      </ScrollView>
    </View>
  );
};

const EmailVerificationScreen = ({ navigation }) => {
  const [code, setCode] = useState('');
  const submit = () => {
    if (code.trim().length < 4) {
      Alert.alert('Code required', 'Enter the verification code we sent to your email.');
      return;
    }
    backendRequired('auth');
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackBar title="Verify email" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={styles.modalIcon}>
            <Icon name="mail" size={26} color={C.goldDeep} />
          </View>
          <Text style={[styles.h1, { textAlign: 'center' }]}>Check your inbox</Text>
          <Text style={[styles.sub, { marginTop: 8, textAlign: 'center', maxWidth: 320 }]}>
            We sent a 6-digit verification code to your email. Enter it below to confirm your account.
          </Text>
        </View>
        <View style={{ gap: 14 }}>
          <TextField label="Verification code" value={code} onChangeText={setCode} placeholder="Enter code" keyboardType="number-pad" />
          <Button title="Verify email" size="lg" onPress={submit} />
          <Button title="Resend code" variant="outline" onPress={() => backendRequired('auth')} />
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================================================
// 11. MAIN TABS
// ============================================================================
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: C.line,
          height: 66 + (Platform.OS === 'ios' ? 0 : 0),
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        tabBarActiveTintColor: C.goldDeep,
        tabBarInactiveTintColor: C.muted2,
        tabBarIcon: ({ focused, color }) => {
          const map = { Home: 'home', Create: 'sparkle', Projects: 'folder', Gallery: 'image', Profile: 'user' };
          return <Icon name={map[route.name] || 'home'} size={22} color={color} strokeWidth={focused ? 2 : 1.7} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Create" component={CreateChatScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// ============================================================================
// 12. HOME SCREEN
// ============================================================================
const HomeScreen = ({ navigation }) => {
  const { user, starBalance } = useApp();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 18, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user.name} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '600' }}>
              Welcome
            </Text>
            <Text style={{ fontSize: 16.5, fontWeight: '600', letterSpacing: -0.2 }} numberOfLines={1}>
              {user.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Packages')}
            style={styles.starPill}
            activeOpacity={0.8}
          >
            <StarIcon size={14} />
            <Text style={{ color: C.goldDeep, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {starBalance > 0 ? fmtNum(starBalance) : '—'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Create with AI</Text>
            <Text style={[styles.h1, { color: '#fff', marginTop: 8, maxWidth: 320 }]}>
              Turn a single sentence into a finished image.
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13.5, marginTop: 8, maxWidth: 320 }}>
              Describe what you want. Refine it through chat. Save the results you love.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Button
                title="Start creating"
                icon="sparkle"
                onPress={() => navigation.navigate('Create')}
                style={{ flex: 1 }}
              />
              <Button
                title="Edit"
                variant="outline"
                icon="wand"
                onPress={() => navigation.navigate('Editor')}
                style={{ flex: 1, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }}
                textStyle={{ color: '#fff' }}
              />
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Get started" />
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={[styles.tile, styles.tileWide]}
              onPress={() => navigation.navigate('Create')}
              activeOpacity={0.85}
            >
              <View style={styles.tileIco}>
                <Icon name="sparkle" size={20} color={C.goldDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>Text to image</Text>
                <Text style={styles.tileSub}>Describe an idea and generate new artwork</Text>
              </View>
              <Icon name="chevron" size={18} color={C.muted2} />
            </TouchableOpacity>

            <View style={styles.tiles}>
              <TouchableOpacity
                style={styles.tile}
                onPress={() => navigation.navigate('Editor')}
                activeOpacity={0.85}
              >
                <View style={styles.tileIco}>
                  <Icon name="wand" size={20} color={C.goldDeep} />
                </View>
                <View>
                  <Text style={styles.tileTitle}>AI editor</Text>
                  <Text style={styles.tileSub}>Enhance, upscale and edit existing images</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tile}
                onPress={() => navigation.navigate('Packages')}
                activeOpacity={0.85}
              >
                <View style={styles.tileIco}>
                  <StarIcon size={20} />
                </View>
                <View>
                  <Text style={styles.tileTitle}>Buy Stars</Text>
                  <Text style={styles.tileSub}>Top up to keep generating and editing</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent projects */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Recent projects" action="See all" onAction={() => navigation.navigate('Projects')} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
        >
          {SAMPLE_PROJECTS.slice(0, 4).map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => navigation.navigate('ProjectDetail', { id: p.id })}
              activeOpacity={0.9}
              style={{ width: 190 }}
            >
              <View style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                <SampleArt seed={p.seed} size={190} radius={16} />
                <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(31,31,31,0.72)', borderRadius: 7 }}>
                  <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2 }}>SAMPLE</Text>
                </View>
              </View>
              <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {p.images} images · {p.updated}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent gallery */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Recent gallery" action="See all" onAction={() => navigation.navigate('Gallery')} />
          <View style={styles.grid3}>
            {SAMPLE_GALLERY.slice(0, 6).map((g) => (
              <TouchableOpacity key={g.id} onPress={() => navigation.navigate('GalleryViewer', { id: g.id })} activeOpacity={0.9}>
                <View style={{ position: 'relative' }}>
                  <SampleArt seed={g.seed} size={(SCREEN_W - 52) / 3} radius={12} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured styles */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Featured styles" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}
        >
          {['Architecture', 'Portrait', 'Product Photography', 'Fantasy', 'Cinematic', 'Editorial'].map((s, i) => (
            <TouchableOpacity
              key={s}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Create', { preset: s })}
              style={{ width: 130 }}
            >
              <SampleArt seed={40 + i * 5} size={130} radius={16} />
              <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// 13. CREATE — chat-style AI image generation
// ============================================================================
const CreateChatScreen = ({ navigation, route }) => {
  const { chatMessages, setChatMessages, starBalance } = useApp();
  const scrollRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [style, setStyle] = useState(route?.params?.preset || 'Realistic');
  const [ratio, setRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1024');
  const [count, setCount] = useState(1);
  const [negative, setNegative] = useState('');

  const selectedRes = RESOLUTIONS.find((r) => r.id === resolution) || RESOLUTIONS[2];
  const estimatedCost = selectedRes.cost * count;

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: uid('msg'),
          role: 'ai',
          type: 'welcome',
          text: "Hi, I'm your TIEG creative partner. Describe the image you'd like, and I'll walk you through generation. You can also attach an image to edit or refine.",
          at: Date.now(),
        },
      ]);
    }
  }, []);

  const scrollToEnd = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const send = () => {
    const text = draft.trim();
    if (!text && chatMessages.length === 0) return;
    const userMsg = { id: uid('msg'), role: 'user', type: 'text', text, at: Date.now() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setDraft('');
    scrollToEnd();

    // Since no backend is connected, we show a friendly in-chat notice.
    setTimeout(() => {
      const notice = {
        id: uid('msg'),
        role: 'ai',
        type: 'notice',
        title: 'Backend connection required',
        text: 'Connect the backend to start generating images. Your prompt is saved in this conversation.',
        prompt: text,
        settings: { style, ratio, resolution, count, negative },
        at: Date.now(),
      };
      setChatMessages([...updated, notice]);
      scrollToEnd();
    }, 400);
  };

  const attachImage = () => {
    const notice = {
      id: uid('msg'),
      role: 'ai',
      type: 'notice',
      title: 'Backend connection required',
      text: 'Image uploads need a connected backend. Once connected, you will be able to attach an image and edit it right here in the conversation.',
      at: Date.now(),
    };
    setChatMessages([...chatMessages, notice]);
    scrollToEnd();
  };

  const newChat = () => {
    Alert.alert(
      'Start a new conversation?',
      'The current conversation will be kept in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New chat',
          onPress: () => {
            setChatMessages([
              {
                id: uid('msg'),
                role: 'ai',
                type: 'welcome',
                text: "New conversation started. What would you like to create today?",
                at: Date.now(),
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      {/* Top bar */}
      <View style={styles.appbar}>
        <TouchableOpacity onPress={newChat} style={styles.iconbtn} activeOpacity={0.7}>
          <Icon name="plus" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 15.5, fontWeight: '600' }}>AI Studio Chat</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Image creation · editing</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.iconbtn}
          activeOpacity={0.7}
        >
          <Icon name="sliders" size={20} />
        </TouchableOpacity>
      </View>

      {/* Chat + composer, keyboard-avoiding */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {/* Settings summary card */}
          <View style={styles.chatSettings}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              <Chip label={style} size="sm" />
              <Chip label={ratio} size="sm" />
              <Chip label={selectedRes.label} size="sm" />
              <Chip label={`×${count}`} size="sm" />
            </View>
            <StarInline amount={estimatedCost} size={13} />
          </View>

          {chatMessages.map((m) => (
            <ChatBubble key={m.id} msg={m} navigation={navigation} />
          ))}
          {busy ? (
            <View style={styles.msg}>
              <View style={styles.msgAvatar}>
                <Icon name="sparkle" size={14} color="#fff" />
              </View>
              <View style={[styles.bubble, { backgroundColor: '#fff' }]}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted2 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted2 }} />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted2 }} />
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TouchableOpacity onPress={attachImage} style={[styles.composerIcon, { marginLeft: 2 }]} activeOpacity={0.7}>
              <Icon name="camera" size={20} color={C.muted} />
            </TouchableOpacity>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Describe an image or edit…"
              placeholderTextColor={C.muted2}
              multiline
              style={styles.composerInput}
              onSubmitEditing={send}
            />
            <TouchableOpacity onPress={send} style={styles.sendBtn} activeOpacity={0.85} disabled={!draft.trim()}>
              <Icon name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Advanced settings modal */}
      <RNModal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={[styles.h2, { marginBottom: 4 }]}>Generation settings</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              These settings apply to your next message in the conversation.
            </Text>

            <ScrollView style={{ maxHeight: SCREEN_H * 0.6 }} contentContainerStyle={{ paddingVertical: 16 }}>
              <Text style={styles.label}>Style</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {STYLES.map((s) => (
                  <Chip key={s} label={s} size="sm" active={style === s} onPress={() => setStyle(s)} />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Aspect ratio</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {RATIOS.map((r) => (
                  <Chip key={r.id} label={r.label} size="sm" active={ratio === r.id} onPress={() => setRatio(r.id)} />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Resolution</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {RESOLUTIONS.map((r) => (
                  <Chip
                    key={r.id}
                    label={`${r.label} · ${r.cost}★`}
                    size="sm"
                    active={resolution === r.id}
                    onPress={() => setResolution(r.id)}
                  />
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Number of images</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {[1, 2, 4].map((n) => (
                  <Chip key={n} label={`${n}`} size="sm" active={count === n} onPress={() => setCount(n)} />
                ))}
              </View>

              <TextField
                label="Negative prompt (optional)"
                value={negative}
                onChangeText={setNegative}
                placeholder="What to avoid in the image"
                multiline
                style={{ marginTop: 20 }}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowSettings(false)} />
              <Button title="Apply" onPress={() => setShowSettings(false)} />
            </View>
          </View>
        </View>
      </RNModal>
    </SafeAreaView>
  );
};

const ChatBubble = ({ msg, navigation }) => {
  if (msg.role === 'user') {
    return (
      <View style={[styles.msg, { flexDirection: 'row-reverse' }]}>
        <View style={styles.msgAvatar}>
          <Icon name="user" size={14} color="#fff" />
        </View>
        <View style={[styles.bubble, { backgroundColor: C.gold, borderTopRightRadius: 6 }]}>
          <Text style={{ color: '#fff', fontSize: 14.5, lineHeight: 21 }}>{msg.text}</Text>
        </View>
      </View>
    );
  }

  // AI
  if (msg.type === 'notice') {
    return (
      <View style={styles.msg}>
        <View style={[styles.msgAvatar, { backgroundColor: C.charcoal }]}>
          <Icon name="sparkle" size={14} color="#fff" />
        </View>
        <View style={[styles.bubble, { backgroundColor: '#FFFCF2', borderColor: 'rgba(201,162,39,0.35)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Icon name="alert" size={14} color={C.goldDeep} />
            <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>{msg.title}</Text>
          </View>
          <Text style={{ color: C.charcoal2, fontSize: 13.8, lineHeight: 20 }}>{msg.text}</Text>
          {msg.settings ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <Chip label={msg.settings.style} size="sm" />
              <Chip label={msg.settings.ratio} size="sm" />
              <Chip label={msg.settings.resolution + ' px'} size="sm" />
              <Chip label={`×${msg.settings.count}`} size="sm" />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.msg}>
      <View style={[styles.msgAvatar, { backgroundColor: C.charcoal }]}>
        <Icon name="sparkle" size={14} color="#fff" />
      </View>
      <View style={styles.bubble}>
        <Text style={{ fontSize: 14.5, lineHeight: 21 }}>{msg.text}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// 14. PROJECTS
// ============================================================================
const ProjectsScreen = ({ navigation }) => {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = SAMPLE_PROJECTS.filter((p) =>
    !query || p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <View style={styles.appbar}>
        <View style={{ width: 40 }} />
        <Text style={[styles.appbarTitle, { flex: 1 }]}>Projects</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Create')} style={styles.iconbtn} activeOpacity={0.7}>
          <Icon name="plus" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 18, paddingTop: 4, gap: 12 }}>
          <PreviewBanner>
            Preview data. Projects will appear here once a connected backend returns your saved work.
          </PreviewBanner>

          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search projects"
              placeholderTextColor={C.muted2}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.tabs}>
            {[
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Drafts' },
              { id: 'complete', label: 'Complete' },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[styles.tab, tab === t.id && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length === 0 ? (
            <EmptyState iconName="folder" title="No projects yet" body="Start a conversation in the Create tab to build your first project." />
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map((p) => (
                <Card key={p.id} style={{ padding: 0, overflow: 'hidden' }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProjectDetail', { id: p.id })}
                    activeOpacity={0.9}
                    style={{ flexDirection: 'row', gap: 12, padding: 12 }}
                  >
                    <View style={{ position: 'relative' }}>
                      <SampleArt seed={p.seed} size={84} radius={14} />
                      <View style={{ position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(31,31,31,0.72)', borderRadius: 5 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>SAMPLE</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '600' }} numberOfLines={1}>{p.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 3 }}>
                        {p.images} images · {p.style}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>Updated {p.updated}</Text>
                        <Status kind={p.status === 'Complete' ? 'ok' : p.status === 'In review' ? 'warn' : 'neutral'}>
                          {p.status}
                        </Status>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ProjectDetailScreen = ({ navigation, route }) => {
  const id = route?.params?.id;
  const project = SAMPLE_PROJECTS.find((p) => p.id === id) || SAMPLE_PROJECTS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title={project.title} navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 18, gap: 14 }}>
          <PreviewBanner>Preview project data. Real project data will be provided by a connected backend.</PreviewBanner>

          <SampleArt seed={project.seed} size={SCREEN_W - 36} radius={18} />

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>Status</Text>
                <View style={{ marginTop: 4 }}>
                  <Status kind={project.status === 'Complete' ? 'ok' : 'warn'}>{project.status}</Status>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>Style</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 4 }}>{project.style}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>Images</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 4 }}>{project.images}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>Updated</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 4 }}>{project.updated}</Text>
              </View>
            </View>
          </Card>

          <SectionHead title="Images" />
          <View style={styles.grid2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => navigation.navigate('GalleryViewer', { id: 'img_' + i })}
                activeOpacity={0.9}
              >
                <View style={{ position: 'relative' }}>
                  <SampleArt seed={project.seed + i + 1} size={(SCREEN_W - 46) / 2} radius={14} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <Button title="Rename" variant="outline" icon="edit" style={{ flex: 1 }} onPress={() => backendRequired('projects')} />
            <Button title="Delete" variant="danger" icon="trash" style={{ flex: 1 }} onPress={() => backendRequired('projects')} />
          </View>
          <Button title="Continue in editor" icon="wand" onPress={() => navigation.navigate('Editor')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// 15. GALLERY
// ============================================================================
const GalleryScreen = ({ navigation }) => {
  const [layout, setLayout] = useState('grid');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('recent');

  const filtered = useMemo(() => {
    let list = SAMPLE_GALLERY;
    if (category !== 'All') list = list.filter((i) => i.category === category);
    if (query) list = list.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));
    if (sort === 'recent') list = [...list].sort((a, b) => b.created - a.created);
    else if (sort === 'oldest') list = [...list].sort((a, b) => a.created - b.created);
    else if (sort === 'name') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [query, category, sort]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <View style={styles.appbar}>
        <View style={{ width: 40 }} />
        <Text style={[styles.appbarTitle, { flex: 1 }]}>Gallery</Text>
        <TouchableOpacity
          onPress={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
          style={styles.iconbtn}
          activeOpacity={0.7}
        >
          <Icon name={layout === 'grid' ? 'list' : 'grid'} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 18, gap: 12 }}>
          <PreviewBanner>
            Sample images for preview. Your real gallery appears here after images are generated with a connected backend.
          </PreviewBanner>

          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search gallery"
              placeholderTextColor={C.muted2}
              style={styles.searchInput}
            />
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Sort by', 'Choose sorting', [
                  { text: 'Recent', onPress: () => setSort('recent') },
                  { text: 'Oldest', onPress: () => setSort('oldest') },
                  { text: 'Name', onPress: () => setSort('name') },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
              style={{ padding: 4 }}
            >
              <Icon name="filter" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {GALLERY_CATEGORIES.map((c) => (
              <Chip key={c} label={c} size="sm" active={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <EmptyState iconName="image" title="No images match your filters" />
          ) : layout === 'grid' ? (
            <View style={styles.grid3}>
              {filtered.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => navigation.navigate('GalleryViewer', { id: g.id })}
                  activeOpacity={0.9}
                >
                  <View style={{ position: 'relative' }}>
                    <SampleArt seed={g.seed} size={(SCREEN_W - 52) / 3} radius={12} />
                    <View style={{ position: 'absolute', top: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: 'rgba(31,31,31,0.72)', borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 8.5, fontWeight: '700', letterSpacing: 1 }}>SAMPLE</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filtered.map((g) => (
                <Card key={g.id} style={{ padding: 10 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('GalleryViewer', { id: g.id })}
                    activeOpacity={0.9}
                    style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
                  >
                    <SampleArt seed={g.seed} size={64} radius={12} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{g.title}</Text>
                      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{g.style} · {g.category}</Text>
                      <Text style={{ color: C.muted2, fontSize: 11.5, marginTop: 2 }}>{timeAgo(g.created)}</Text>
                    </View>
                    <Icon name="chevron" size={18} color={C.muted2} />
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const GalleryViewerScreen = ({ navigation, route }) => {
  const id = route?.params?.id;
  const item = SAMPLE_GALLERY.find((g) => g.id === id) || SAMPLE_GALLERY[0];
  const [full, setFull] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title="Image" navigation={navigation} rightSlot={
        <TouchableOpacity onPress={() => setFull(true)} style={styles.iconbtn} activeOpacity={0.7}>
          <Icon name="expand" size={18} />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 18, gap: 14 }}>
          <SampleArt seed={item.seed} size={SCREEN_W - 36} radius={18} />

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 3 }}>
                  {item.style} · {item.category}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Status kind="warn">Sample preview</Status>
                </View>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Download" variant="outline" icon="download" style={{ flex: 1 }} onPress={() => backendRequired('gallery')} />
            <Button title="Share" variant="outline" icon="share" style={{ flex: 1 }} onPress={() => backendRequired('gallery')} />
            <Button title="Delete" variant="danger" icon="trash" style={{ flex: 1 }} onPress={() => backendRequired('gallery')} />
          </View>

          <Button title="Edit this image" icon="wand" onPress={() => navigation.navigate('Editor')} />
        </View>
      </ScrollView>

      {/* Full-screen viewer */}
      <RNModal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(16,15,13,0.97)' }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
              <TouchableOpacity onPress={() => setFull(false)} style={[styles.iconbtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' }} numberOfLines={1}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() => backendRequired('gallery')}
                style={[styles.iconbtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }]}
              >
                <Icon name="download" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <SampleArt seed={item.seed} size={SCREEN_W - 32} radius={16} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
              <Button title="Download" variant="outline" icon="download" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }} textStyle={{ color: '#fff' }} onPress={() => backendRequired('gallery')} />
              <Button title="Share" variant="outline" icon="share" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }} textStyle={{ color: '#fff' }} onPress={() => backendRequired('gallery')} />
            </View>
          </SafeAreaView>
        </View>
      </RNModal>
    </SafeAreaView>
  );
};

// ============================================================================
// 16. PROFILE
// ============================================================================
const ProfileScreen = ({ navigation }) => {
  const { user, starBalance, settings, setSettings } = useApp();
  const { navigate } = navigation;

  const RowItem = ({ icon: iconName, label, sub, onPress, danger }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? 'rgba(180,69,60,0.1)' : 'rgba(201,162,39,0.12)' }}>
        <Icon name={iconName} size={17} color={danger ? C.danger : C.goldDeep} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: danger ? C.danger : C.charcoal }}>{label}</Text>
        {sub ? <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color={C.muted2} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
          <Card gold>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.name} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '600' }} numberOfLines={1}>{user.name}</Text>
                <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Status kind="warn">{user.plan}</Status>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigate('EditProfile')}
              style={{ marginTop: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(201,162,39,0.55)' }}
              activeOpacity={0.8}
            >
              <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13.5 }}>Edit profile</Text>
            </TouchableOpacity>
          </Card>

          <View style={{ marginTop: 18 }}>
            <Card style={{ padding: 0 }}>
              <TouchableOpacity onPress={() => navigate('Packages')} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.12)' }}>
                  <StarIcon size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500' }}>Star balance</Text>
                  <Text style={{ fontSize: 19, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] }}>
                    {starBalance > 0 ? `${fmtNum(starBalance)} Stars` : '—'}
                  </Text>
                </View>
                <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>Buy Stars</Text>
              </TouchableOpacity>
            </Card>
          </View>
        </View>

        {/* Account */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Account" />
        </View>
        <View style={{ marginHorizontal: 18 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <RowItem icon="user" label="Personal information" sub="Name, email and avatar" onPress={() => navigate('EditProfile')} />
            <RowItem icon="lock" label="Password and security" sub="Reset password and 2FA" onPress={() => backendRequired('auth')} />
            <RowItem icon="card" label="Payment methods" sub="Manage providers and receipts" onPress={() => navigate('Packages')} />
            <RowItem icon="history" label="Transaction history" sub="Star purchases and refunds" onPress={() => navigate('PaymentHistory')} />
          </Card>
        </View>

        {/* Preferences */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Preferences" />
        </View>
        <View style={{ marginHorizontal: 18 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.12)' }}>
                <Icon name="bell" size={17} color={C.goldDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '500' }}>Notifications</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Alerts about generations and payments</Text>
              </View>
              <Switch
                value={settings.notifications.generations}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, notifications: { ...s.notifications, generations: v } }))
                }
                trackColor={{ true: C.gold, false: 'rgba(31,31,31,0.15)' }}
                thumbColor="#fff"
              />
            </View>
            <RowItem icon="moon" label="Appearance" sub="Light or dark interface" onPress={() => navigate('Settings')} />
            <RowItem icon="shield" label="Privacy and data" sub="Controls and downloads" onPress={() => navigate('Privacy')} />
          </Card>
        </View>

        {/* Admin + support */}
        <View style={{ paddingHorizontal: 18 }}>
          <SectionHead title="Studio" />
        </View>
        <View style={{ marginHorizontal: 18 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <RowItem icon="shield" label="Admin dashboard" sub="Manage providers, users and pricing" onPress={() => navigate('AdminLogin')} />
            <RowItem icon="help" label="Help and support" onPress={() => navigate('Help')} />
            <RowItem icon="doc" label="Terms of service" onPress={() => navigate('Terms')} />
          </Card>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
          <Button
            title="Sign out"
            variant="danger"
            icon="logout"
            onPress={() =>
              Alert.alert('Sign out?', 'You will be signed out of TIEG AI Creative Studio on this device.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => backendRequired('auth') },
              ])
            }
          />
          <Text style={{ textAlign: 'center', color: C.muted2, fontSize: 11.5, marginTop: 14, letterSpacing: 0.4 }}>
            TIEG AI Creative Studio · v0.1 preview
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const EditProfileScreen = ({ navigation }) => {
  const { user, setUser } = useApp();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email === 'Not signed in' ? '' : user.email);
  const [bio, setBio] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title="Edit profile" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Avatar name={name || 'You'} size={84} />
          <TouchableOpacity onPress={() => backendRequired('profile')} style={{ marginTop: 10 }}>
            <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>Change avatar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 14 }}>
          <TextField label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
          <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Short bio" />
          <PreviewBanner>Saving profile changes requires a connected backend. Nothing is stored on this device.</PreviewBanner>
          <Button title="Save changes" size="lg" onPress={() => backendRequired('profile')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// 17. SETTINGS & SECONDARY SCREENS
// ============================================================================
const SettingsScreen = ({ navigation }) => {
  const { settings, setSettings } = useApp();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title="Settings" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}>
        <Card>
          <Text style={styles.label}>Appearance</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Chip label="Light" active={settings.theme === 'light'} onPress={() => setSettings((s) => ({ ...s, theme: 'light' }))} />
            <Chip label="Dark" active={settings.theme === 'dark'} onPress={() => setSettings((s) => ({ ...s, theme: 'dark' }))} />
            <Chip label="System" active={settings.theme === 'system'} onPress={() => setSettings((s) => ({ ...s, theme: 'system' }))} />
          </View>
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '500' }}>Reduce motion</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Minimise animations in the app</Text>
            </View>
            <Switch
              value={settings.reduceMotion}
              onValueChange={(v) => setSettings((s) => ({ ...s, reduceMotion: v }))}
              trackColor={{ true: C.gold, false: 'rgba(31,31,31,0.15)' }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <SectionHead title="Notifications" />
        <Card style={{ padding: 0 }}>
          {Object.keys(settings.notifications).map((k, i) => {
            const labels = {
              generations: 'Image generations',
              payments: 'Payments and Stars',
              product: 'Product updates',
              tips: 'Creative tips',
            };
            return (
              <View
                key={k}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < Object.keys(settings.notifications).length - 1 ? 1 : 0,
                  borderBottomColor: C.line,
                }}
              >
                <Text style={{ flex: 1, fontSize: 14.5 }}>{labels[k]}</Text>
                <Switch
                  value={settings.notifications[k]}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [k]: v } }))
                  }
                  trackColor={{ true: C.gold, false: 'rgba(31,31,31,0.15)' }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </Card>

        <SectionHead title="Account" />
        <Card style={{ padding: 0 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Icon name="shield" size={18} color={C.goldDeep} />
            <Text style={{ flex: 1, fontSize: 14.5 }}>Privacy policy</Text>
            <Icon name="chevron" size={18} color={C.muted2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Icon name="doc" size={18} color={C.goldDeep} />
            <Text style={{ flex: 1, fontSize: 14.5 }}>Terms of service</Text>
            <Icon name="chevron" size={18} color={C.muted2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Help')} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="help" size={18} color={C.goldDeep} />
            <Text style={{ flex: 1, fontSize: 14.5 }}>Help and support</Text>
            <Icon name="chevron" size={18} color={C.muted2} />
          </TouchableOpacity>
        </Card>

        <PreviewBanner>Settings are stored locally in the UI only. Once a backend is connected, preferences will sync to your account.</PreviewBanner>
      </ScrollView>
    </SafeAreaView>
  );
};

const PrivacyScreen = ({ navigation }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
    <BackBar title="Privacy policy" navigation={navigation} />
    <ScrollView contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>Privacy policy</Text>
      <Text style={[styles.sub, { marginTop: 8 }]}>
        This is a preview of the TIEG AI Creative Studio privacy policy. The final text will be published by the connected backend.
      </Text>
      {[
        ['Data we collect', 'Account details, generation history and usage metrics that help us run the studio.'],
        ['How we use data', 'To generate and store images, process Star purchases and improve the creative experience.'],
        ['Your controls', 'You can export or delete your data at any time from your account settings.'],
        ['Security', 'All data is transmitted over HTTPS once a live backend is connected.'],
      ].map(([t, b]) => (
        <View key={t} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{t}</Text>
          <Text style={{ color: C.charcoal2, fontSize: 13.8, marginTop: 6, lineHeight: 21 }}>{b}</Text>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const TermsScreen = ({ navigation }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
    <BackBar title="Terms of service" navigation={navigation} />
    <ScrollView contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>Terms of service</Text>
      <Text style={[styles.sub, { marginTop: 8 }]}>
        The full TIEG AI Creative Studio terms will be published once the backend is connected.
      </Text>
      {[
        ['Use of the studio', 'Generate and edit responsibly. Do not create content that is illegal or harms others.'],
        ['Stars', 'Stars are a credit currency used inside the studio. Pricing and refunds follow the published package rules.'],
        ['Content ownership', 'You retain rights to images you create, subject to the AI provider terms connected later.'],
        ['Availability', 'Features that require a server are only available once a real backend is connected.'],
      ].map(([t, b]) => (
        <View key={t} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>{t}</Text>
          <Text style={{ color: C.charcoal2, fontSize: 13.8, marginTop: 6, lineHeight: 21 }}>{b}</Text>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const HelpScreen = ({ navigation }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
    <BackBar title="Help and support" navigation={navigation} />
    <ScrollView contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>How can we help?</Text>
      <Text style={[styles.sub, { marginTop: 8 }]}>
        Browse common questions or reach the studio team.
      </Text>
      <Card style={{ marginTop: 18, padding: 0 }}>
        {[
          ['How do Stars work?', 'Stars are the studio credit used for image generation and editing.'],
          ['Can I edit an image I already created?', 'Yes — open the image and choose Edit to continue in the AI editor.'],
          ['Why do some actions say “Backend connection required”?', 'Some features need a live server. This build has no backend connected yet.'],
          ['How do I delete my account?', 'Account deletion is handled by the backend once it is connected.'],
        ].map(([q, a], i, arr) => (
          <View key={q} style={{ padding: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <Text style={{ fontWeight: '600', fontSize: 14.5 }}>{q}</Text>
            <Text style={{ color: C.charcoal2, fontSize: 13.5, marginTop: 6, lineHeight: 20 }}>{a}</Text>
          </View>
        ))}
      </Card>
      <Button title="Contact support" icon="mail" style={{ marginTop: 18 }} onPress={() => backendRequired('profile')} />
    </ScrollView>
  </SafeAreaView>
);

// ============================================================================
// 18. STARS & PAYMENTS
// ============================================================================
const PackagesScreen = ({ navigation }) => {
  const { starBalance } = useApp();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title="Buy Stars" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Card gold>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.15)' }}>
              <StarIcon size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, color: C.muted, fontWeight: '500' }}>Current balance</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] }}>
                {starBalance > 0 ? `${fmtNum(starBalance)} Stars` : '— Stars'}
              </Text>
            </View>
          </View>
        </Card>

        <PreviewBanner>Payment provider connection required. No real payments are processed in this build and no credits are added.</PreviewBanner>

        <SectionHead title="Choose a package" />
        <View style={{ gap: 12 }}>
          {STAR_PACKAGES.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.12)' }}>
                  <StarIcon size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 15.5, fontWeight: '600' }}>{p.name}</Text>
                    {p.badge ? (
                      <View style={{ backgroundColor: C.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>{p.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 3 }}>{p.desc}</Text>
                  <Text style={{ color: C.charcoal, fontSize: 14, fontWeight: '600', marginTop: 6 }}>
                    {fmtNum(p.stars)} Stars · {fmtMoney(p.price, p.cur)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Payment provider connection required',
                    `“${p.name} — ${fmtNum(p.stars)} Stars” cannot be purchased yet. No payment provider is connected and no payment was processed.`,
                    [{ text: 'OK' }]
                  )
                }
                style={{ marginTop: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: C.gold }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Buy {fmtMoney(p.price, p.cur)}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        <Card style={{ marginTop: 16, borderStyle: 'dashed' }}>
          <Text style={{ fontSize: 15, fontWeight: '600' }}>Custom package</Text>
          <Text style={{ color: C.muted, fontSize: 12.8, marginTop: 4 }}>
            Custom Star amounts and pricing will be configurable by an administrator once a backend is connected.
          </Text>
        </Card>

        <TouchableOpacity
          onPress={() => navigation.navigate('PaymentHistory')}
          style={{ marginTop: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Icon name="history" size={16} color={C.goldDeep} />
          <Text style={{ color: C.goldDeep, fontWeight: '600', fontSize: 13.5 }}>View transaction history</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const PaymentHistoryScreen = ({ navigation }) => (
  <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
    <BackBar title="Transactions" navigation={navigation} />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <PreviewBanner>Sample transaction records for preview only. No real payments are processed.</PreviewBanner>
      <View style={{ gap: 10, marginTop: 12 }}>
        {SAMPLE_TRANSACTIONS.map((t) => (
          <Card key={t.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontWeight: '600', fontSize: 14 }}>{t.pkg}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{t.id} · {t.provider}</Text>
              </View>
              <Text style={{ fontWeight: '600', fontSize: 15 }}>{fmtMoney(t.amount, t.cur)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>{t.date}</Text>
              <Status kind="warn">{t.status}</Status>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

// ============================================================================
// 19. AI EDITOR
// ============================================================================
const EditorScreen = ({ navigation }) => {
  const { starBalance } = useApp();
  const [action, setAction] = useState('edit');
  const [prompt, setPrompt] = useState('');
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);

  const currentAction = EDIT_ACTIONS.find((a) => a.id === action);

  const run = () => {
    if (action === 'edit' && !prompt.trim()) {
      Alert.alert('Describe your edit', 'Add a written instruction so the AI can apply it.');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      backendRequired('edit');
    }, 600);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar
        title="AI editor"
        navigation={navigation}
        rightSlot={
          <TouchableOpacity onPress={() => backendRequired('gallery')} style={styles.iconbtn} activeOpacity={0.7}>
            <Icon name="download" size={18} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <PreviewBanner>
          Editing operations require a connected image-processing backend. Nothing is edited in this preview.
        </PreviewBanner>

        {/* Before / After */}
        <View style={{ marginTop: 14 }}>
          <View style={styles.compare}>
            <View style={{ flex: 1 }}>
              <Text style={styles.compareLabel}>Before</Text>
              <SampleArt seed={30} size={(SCREEN_W - 46) / 2} radius={14} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compareLabel}>After</Text>
              <SampleArt seed={31} size={(SCREEN_W - 46) / 2} radius={14} />
            </View>
          </View>
        </View>

        {/* Upload */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button
            title="Upload image"
            variant="outline"
            icon="upload"
            style={{ flex: 1 }}
            onPress={() => backendRequired('upload')}
          />
          <Button
            title="Undo"
            variant="ghost"
            icon="undo"
            style={{ flex: 1 }}
            onPress={() => Alert.alert('Nothing to undo', 'Edit history is empty in this preview.')}
          />
          <Button
            title="Redo"
            variant="ghost"
            icon="redo"
            style={{ flex: 1 }}
            onPress={() => Alert.alert('Nothing to redo', 'Edit history is empty in this preview.')}
          />
        </View>

        {/* Action chips */}
        <SectionHead title="Choose an operation" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {EDIT_ACTIONS.map((a) => (
            <Chip key={a.id} label={`${a.label} · ${a.cost}★`} active={action === a.id} onPress={() => setAction(a.id)} icon={a.icon} />
          ))}
        </ScrollView>
        <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 10 }}>{currentAction?.desc}</Text>

        <TextField
          label={action === 'edit' ? 'Editing prompt' : 'Optional prompt'}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="e.g. Add a chair beside the window"
          multiline
          style={{ marginTop: 14 }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.muted, fontSize: 12.5 }}>Cost</Text>
            <StarInline amount={currentAction?.cost || 0} />
          </View>
          <Text style={{ color: C.muted, fontSize: 12.5 }}>Balance {starBalance > 0 ? starBalance : '—'}</Text>
        </View>

        <Button
          title={busy ? 'Working…' : `Run ${currentAction?.label || 'edit'}`}
          size="lg"
          disabled={busy}
          icon={busy ? undefined : 'wand'}
          onPress={run}
          style={{ marginTop: 14 }}
        />

        <Button
          title="Open full-screen viewer"
          variant="outline"
          icon="expand"
          style={{ marginTop: 10 }}
          onPress={() => navigation.navigate('GalleryViewer', { id: 'img_1' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// 20. ADMIN — Login and Dashboard
// ============================================================================
const AdminLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={['top']}>
      <BackBar title="Admin access" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={styles.modalIcon}>
            <Icon name="shield" size={28} color={C.goldDeep} />
          </View>
          <Text style={styles.h1}>Admin sign in</Text>
          <Text style={[styles.sub, { textAlign: 'center', marginTop: 6, maxWidth: 320 }]}>
            Administrative access must be verified by the backend. No credentials are stored on this device.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <TextField label="Admin email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="admin@example.com" />
          <TextField
            label="Password"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry={!showPwd}
            rightSlot={
              <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={{ padding: 8 }}>
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={18} color={C.muted} />
              </TouchableOpacity>
            }
          />
          <TouchableOpacity onPress={() => backendRequired('auth')}>
            <Text style={{ alignSelf: 'flex-end', color: C.goldDeep, fontWeight: '600', fontSize: 13 }}>
              Forgot password?
            </Text>
          </TouchableOpacity>
          <Button
            title="Sign in as admin"
            size="lg"
            icon="shield"
            onPress={() =>
              Alert.alert(
                'Backend connection required',
                'Real admin authentication must be verified by a secure backend. No admin access is granted from this preview.',
                [
                  { text: 'OK' },
                  {
                    text: 'Preview admin UI',
                    onPress: () => navigation.navigate('AdminDashboard'),
                  },
                ]
              )
            }
          />
          <PreviewBanner>
            The admin preview is for design review only. It does not grant real privileges and no data is stored.
          </PreviewBanner>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ADMIN_NAV = [
  { id: 'admin-overview', label: 'Overview', icon: 'chart' },
  { id: 'admin-users', label: 'Users', icon: 'users' },
  { id: 'admin-ai', label: 'AI Providers', icon: 'cpu' },
  { id: 'admin-payments', label: 'Payment Providers', icon: 'card' },
  { id: 'admin-pricing', label: 'Stars & Pricing', icon: 'tag' },
  { id: 'admin-generations', label: 'Generations', icon: 'sparkle' },
  { id: 'admin-transactions', label: 'Transactions', icon: 'wallet' },
  { id: 'admin-analytics', label: 'Analytics', icon: 'activity' },
  { id: 'admin-logs', label: 'Activity Logs', icon: 'history' },
  { id: 'admin-settings', label: 'App Settings', icon: 'settings' },
];

const AdminDashboardScreen = ({ navigation }) => {
  const [screen, setScreen] = useState('admin-overview');
  const [drawer, setDrawer] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F1EC' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F1EC" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={() => setDrawer(true)} style={styles.iconbtn} activeOpacity={0.7}>
          <Icon name="menu" size={20} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '600' }}>TIEG Admin</Text>
          <Text style={{ color: C.muted, fontSize: 11.5 }}>Preview mode · Backend not connected</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.iconbtn} activeOpacity={0.7}>
          <Icon name="arrowLeft" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <PreviewBanner>
          Sample analytics and admin controls for design preview only. Real admin functionality requires a connected backend.
        </PreviewBanner>
        <View style={{ height: 14 }} />
        <AdminScreenSwitch screen={screen} navigation={navigation} />
      </ScrollView>

      {/* Sidebar (overlay drawer) */}
      <RNModal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 280, backgroundColor: C.charcoal, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold }}>
                <Icon name="sparkle" size={20} color="#fff" />
              </View>
              <View>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>TIEG Admin</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Preview mode</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ADMIN_NAV.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setScreen(item.id);
                    setDrawer(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 3,
                    backgroundColor: screen === item.id ? 'rgba(229,199,107,0.18)' : 'transparent',
                  }}
                  activeOpacity={0.75}
                >
                  <Icon name={item.icon} size={18} color={screen === item.id ? C.goldLight : 'rgba(255,255,255,0.75)'} />
                  <Text style={{ color: screen === item.id ? C.goldLight : 'rgba(255,255,255,0.85)', fontSize: 13.5, fontWeight: '500' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 }} />
              <TouchableOpacity
                onPress={() => {
                  setDrawer(false);
                  navigation.navigate('Main');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12 }}
              >
                <Icon name="arrowLeft" size={18} color="rgba(255,255,255,0.75)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5 }}>Back to user app</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDrawer(false);
                  navigation.goBack();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12 }}
              >
                <Icon name="logout" size={18} color="rgba(255,255,255,0.75)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5 }}>Sign out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setDrawer(false)} />
        </View>
      </RNModal>
    </SafeAreaView>
  );
};

const AdminScreenSwitch = ({ screen, navigation }) => {
  switch (screen) {
    case 'admin-overview': return <AdminOverview />;
    case 'admin-users': return <AdminUsers />;
    case 'admin-ai': return <AdminAI />;
    case 'admin-payments': return <AdminPayments />;
    case 'admin-pricing': return <AdminPricing />;
    case 'admin-generations': return <AdminGenerations />;
    case 'admin-transactions': return <AdminTransactions />;
    case 'admin-analytics': return <AdminAnalytics />;
    case 'admin-logs': return <AdminLogs />;
    case 'admin-settings': return <AdminSettings />;
    default: return <AdminOverview />;
  }
};

const Kpi = ({ label, value, delta, deltaKind }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
    {delta ? (
      <Text style={{ fontSize: 12, marginTop: 4, fontWeight: '600', color: deltaKind === 'down' ? C.danger : C.success }}>
        {delta}
      </Text>
    ) : null}
  </View>
);

const AdminOverview = () => (
  <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Registered users</Text><Text style={styles.kpiValue}>1,284</Text><Text style={{ color: C.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>+8.4% MoM</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Active users</Text><Text style={styles.kpiValue}>412</Text><Text style={{ color: C.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>+3.1% MoM</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Images generated</Text><Text style={styles.kpiValue}>26,940</Text><Text style={{ color: C.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>+12.7% MoM</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Stars purchased</Text><Text style={styles.kpiValue}>184,500</Text><Text style={{ color: C.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>+9.2% MoM</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Revenue (preview)</Text><Text style={styles.kpiValue}>$12,840</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Sample data</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Pending transactions</Text><Text style={styles.kpiValue}>7</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Awaiting verification</Text></View>
    </View>

    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 4 }}>System status</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={{ fontSize: 13.5 }}>AI provider status</Text>
        <Status kind="warn">Not connected</Status>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
        <Text style={{ fontSize: 13.5 }}>Payment provider status</Text>
        <Status kind="warn">Not connected</Status>
      </View>
    </Card>

    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 12 }}>Recent activity</Text>
      {SAMPLE_LOGS.slice(0, 4).map((l, i) => (
        <View key={i} style={{ paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line }}>
          <Text style={{ fontSize: 13.5 }}>{l.action}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{l.time} · {l.admin}</Text>
        </View>
      ))}
    </Card>
  </View>
);

const AdminUsers = () => (
  <Card style={{ padding: 0 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: '#FCFAF6', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 12 }}>
          {['User', 'Email', 'Joined', 'Status', 'Stars', 'Generations'].map((h) => (
            <Text key={h} style={{ width: 140, paddingHorizontal: 12, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: C.muted }}>
              {h}
            </Text>
          ))}
        </View>
        {SAMPLE_USERS.map((u, i) => (
          <View key={u.id} style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: i < SAMPLE_USERS.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <View style={{ width: 140, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar name={u.name} size={28} />
              <Text style={{ fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{u.name}</Text>
            </View>
            <Text style={{ width: 220, paddingHorizontal: 12, fontSize: 13, color: C.muted }} numberOfLines={1}>{u.email}</Text>
            <Text style={{ width: 120, paddingHorizontal: 12, fontSize: 13, color: C.muted }}>{u.joined}</Text>
            <View style={{ width: 120, paddingHorizontal: 12 }}>
              <Status kind={u.status === 'Active' ? 'ok' : u.status === 'Suspended' ? 'err' : 'warn'}>{u.status}</Status>
            </View>
            <Text style={{ width: 80, paddingHorizontal: 12, fontSize: 13, fontWeight: '600' }}>{u.stars}</Text>
            <Text style={{ width: 120, paddingHorizontal: 12, fontSize: 13, color: C.muted }}>{u.generations}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: C.line }}>
      <Button title="Suspend or adjust user" variant="outline" onPress={() => backendRequired('admin')} />
    </View>
  </Card>
);

const AdminAI = () => {
  const providers = [
    { id: 'p1', name: 'Provider A (image + edit)', enabled: true, isDefault: true, status: 'Not connected' },
    { id: 'p2', name: 'Provider B (image only)', enabled: false, isDefault: false, status: 'Not connected' },
  ];
  return (
    <View style={{ gap: 12 }}>
      <PreviewBanner>
        Provider credentials and connection tests must run through the backend. No keys are stored on the frontend.
      </PreviewBanner>
      {providers.map((p) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '600', fontSize: 14.5 }}>{p.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                {p.isDefault ? 'Default provider' : p.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Status kind="warn">{p.status}</Status>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button title="Configure" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => backendRequired('admin')} />
            <Button title="Test" variant="ghost" size="sm" style={{ flex: 1 }} onPress={() => backendRequired('admin')} />
          </View>
        </Card>
      ))}
      <Button title="Add AI provider" icon="plus" onPress={() => backendRequired('admin')} />
    </View>
  );
};

const AdminPayments = () => {
  const providers = ['Paystack', 'Google Play Billing', 'Apple In-App Purchases', 'Custom provider'];
  return (
    <View style={{ gap: 12 }}>
      <PreviewBanner>Payment providers must be enabled and verified by the backend. No secrets are stored in the app.</PreviewBanner>
      {providers.map((p) => (
        <Card key={p}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', fontSize: 14.5 }}>{p}</Text>
            <Status kind="warn">Not connected</Status>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button title="Configure" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => backendRequired('admin')} />
            <Button title="Currency" variant="ghost" size="sm" style={{ flex: 1 }} onPress={() => backendRequired('admin')} />
          </View>
        </Card>
      ))}
    </View>
  );
};

const AdminPricing = () => {
  const [packages, setPackages] = useState(STAR_PACKAGES);
  return (
    <View style={{ gap: 12 }}>
      <PreviewBanner>
        Changes you make here are not saved — a connected backend is required to persist pricing.
      </PreviewBanner>
      {packages.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: '600', fontSize: 14.5 }}>{p.name}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Stars</Text>
              <TextInput
                value={String(p.stars)}
                keyboardType="number-pad"
                onChangeText={(v) =>
                  setPackages((arr) => arr.map((x) => (x.id === p.id ? { ...x, stars: Number(v) || 0 } : x)))
                }
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price (USD)</Text>
              <TextInput
                value={String(p.price)}
                keyboardType="decimal-pad"
                onChangeText={(v) =>
                  setPackages((arr) => arr.map((x) => (x.id === p.id ? { ...x, price: Number(v) || 0 } : x)))
                }
                style={styles.input}
              />
            </View>
          </View>
        </Card>
      ))}
      <Button title="Save pricing" onPress={() => backendRequired('admin')} />
    </View>
  );
};

const AdminGenerations = () => (
  <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Total requests</Text><Text style={styles.kpiValue}>31,240</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Successful</Text><Text style={styles.kpiValue}>29,880</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Failed</Text><Text style={styles.kpiValue}>1,360</Text></View>
      <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Avg. processing</Text><Text style={styles.kpiValue}>4.2 s</Text></View>
    </View>
    <PreviewBanner>Sample metrics for layout preview. Real generation data requires a connected backend.</PreviewBanner>
  </View>
);

const AdminTransactions = () => (
  <Card style={{ padding: 0 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: '#FCFAF6', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 12 }}>
          {['Reference', 'User', 'Package', 'Amount', 'Provider', 'Status', 'Date'].map((h) => (
            <Text key={h} style={{ width: 150, paddingHorizontal: 12, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: C.muted }}>
              {h}
            </Text>
          ))}
        </View>
        {SAMPLE_TRANSACTIONS.map((t, i) => (
          <View key={t.id} style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: i < SAMPLE_TRANSACTIONS.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <Text style={{ width: 150, paddingHorizontal: 12, fontSize: 13, fontWeight: '600' }}>{t.id}</Text>
            <Text style={{ width: 180, paddingHorizontal: 12, fontSize: 13, color: C.muted }} numberOfLines={1}>{t.user}</Text>
            <Text style={{ width: 200, paddingHorizontal: 12, fontSize: 13 }} numberOfLines={1}>{t.pkg}</Text>
            <Text style={{ width: 120, paddingHorizontal: 12, fontSize: 13, fontWeight: '600' }}>{fmtMoney(t.amount, t.cur)}</Text>
            <Text style={{ width: 200, paddingHorizontal: 12, fontSize: 13, color: C.muted }} numberOfLines={1}>{t.provider}</Text>
            <View style={{ width: 180, paddingHorizontal: 12 }}><Status kind="warn">{t.status}</Status></View>
            <Text style={{ width: 180, paddingHorizontal: 12, fontSize: 13, color: C.muted }}>{t.date}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  </Card>
);

const AdminAnalytics = () => (
  <View style={{ gap: 12 }}>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>User growth (sample)</Text>
      <View style={{ height: 160, borderRadius: 12, backgroundColor: '#FAF6EE', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>Chart preview</Text>
      </View>
    </Card>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>Image generations (sample)</Text>
      <View style={{ height: 160, borderRadius: 12, backgroundColor: '#FAF6EE', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>Chart preview</Text>
      </View>
    </Card>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>Revenue (sample)</Text>
      <View style={{ height: 160, borderRadius: 12, backgroundColor: '#FAF6EE', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted, fontSize: 12.5 }}>Chart preview</Text>
      </View>
    </Card>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>Popular styles</Text>
      {['Realistic', 'Architecture', 'Product Photography', 'Fantasy', 'Portrait'].map((s, i) => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
          <Text style={{ width: 130, fontSize: 13 }}>{s}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(31,31,31,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${85 - i * 12}%`, height: '100%', backgroundColor: C.gold }} />
          </View>
          <Text style={{ width: 44, textAlign: 'right', fontSize: 12.5, color: C.muted }}>{85 - i * 12}%</Text>
        </View>
      ))}
    </Card>
  </View>
);

const AdminLogs = () => (
  <Card style={{ padding: 0 }}>
    {SAMPLE_LOGS.map((l, i) => (
      <View key={i} style={{ padding: 16, borderBottomWidth: i < SAMPLE_LOGS.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13.5, fontWeight: '500', flex: 1 }}>{l.action}</Text>
          <Status kind="neutral">{l.scope}</Status>
        </View>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{l.time} · {l.admin}</Text>
      </View>
    ))}
  </Card>
);

const AdminSettings = () => (
  <View style={{ gap: 12 }}>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 12 }}>Application</Text>
      <TextField label="App name" value="TIEG AI Creative Studio" editable={false} />
      <View style={{ height: 12 }} />
      <TextField label="Support email" value="support@example.com" editable={false} />
      <View style={{ height: 12 }} />
      <TextField label="Default currency" value="USD" editable={false} />
    </Card>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>Maintenance mode</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 13.5, color: C.charcoal2 }}>Show maintenance screen to users</Text>
        <Switch value={false} onValueChange={() => backendRequired('admin')} trackColor={{ true: C.gold, false: 'rgba(31,31,31,0.15)' }} thumbColor="#fff" />
      </View>
    </Card>
    <Card>
      <Text style={{ fontSize: 14.5, fontWeight: '600', marginBottom: 10 }}>Credit rules</Text>
      <Text style={{ color: C.muted, fontSize: 12.5, marginBottom: 10 }}>Default generation and editing costs.</Text>
      {[
        ['Text to image (base)', '5 Stars'],
        ['Image edit', '4 Stars'],
        ['Background removal', '3 Stars'],
        ['Upscale (2×)', '6 Stars'],
      ].map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }}>
          <Text style={{ fontSize: 13.5 }}>{k}</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '600' }}>{v}</Text>
        </View>
      ))}
    </Card>
    <Button title="Save settings" onPress={() => backendRequired('admin')} />
  </View>
);

// ============================================================================
// 21. NAVIGATION ROOT
// ============================================================================
const RootStack = createNativeStackNavigator();

const navTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    background: C.cream,
    card: '#FFFFFF',
    text: C.charcoal,
    primary: C.gold,
    border: C.line,
  },
};

const App = () => {
  return (
    <AppProvider>
      <NavigationContainer theme={navTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }}>
          <RootStack.Screen name="Splash" component={SplashScreen} />
          <RootStack.Screen name="Auth" component={AuthStack} />
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
          <RootStack.Screen name="GalleryViewer" component={GalleryViewerScreen} />
          <RootStack.Screen name="Editor" component={EditorScreen} />
          <RootStack.Screen name="Packages" component={PackagesScreen} />
          <RootStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
          <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
          <RootStack.Screen name="Settings" component={SettingsScreen} />
          <RootStack.Screen name="Privacy" component={PrivacyScreen} />
          <RootStack.Screen name="Terms" component={TermsScreen} />
          <RootStack.Screen name="Help" component={HelpScreen} />
          <RootStack.Screen name="AdminLogin" component={AdminLoginScreen} />
          <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
};

const AuthStackNav = createNativeStackNavigator();
const AuthStack = () => (
  <AuthStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream } }}>
    <AuthStackNav.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStackNav.Screen name="SignIn" component={SignInScreen} />
    <AuthStackNav.Screen name="SignUp" component={SignUpScreen} />
    <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStackNav.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <AuthStackNav.Screen name="EmailVerification" component={EmailVerificationScreen} />
  </AuthStackNav.Navigator>
);

// ============================================================================
// 22. SHARED STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Layout
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(248,245,240,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  appbarTitle: { fontSize: 15.5, fontWeight: '600', color: C.charcoal },
  iconbtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  // Buttons
  // (button styles handled by the Button component)
  // Inputs
  label: { fontSize: 12.5, fontWeight: '600', color: C.charcoal2, letterSpacing: 0.2 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.lineStrong,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    fontSize: 14.5,
    color: C.charcoal,
  },
  // Cards
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  h3: { fontSize: 15.5, fontWeight: '600', color: C.charcoal },
  // Tiles
  tile: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 120,
    justifyContent: 'space-between',
    shadowColor: '#1F1F1F',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  tileWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
  },
  tileIco: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  tileTitle: { fontSize: 14, fontWeight: '600' },
  tileSub: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 16 },
  tiles: { flexDirection: 'row', gap: 12 },
  // Grid
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Splash
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cream,
    gap: 22,
    padding: 24,
  },
  splashLogo: {
    width: 108,
    height: 108,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.gold,
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 8,
  },
  splashName: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
    color: C.goldDeep,
  },
  splashSub: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: C.muted,
    marginTop: -8,
  },
  splashBarTrack: {
    width: 150,
    height: 3,
    backgroundColor: 'rgba(31,31,31,0.09)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  splashBarFill: {
    height: '100%',
    backgroundColor: C.gold,
    borderRadius: 3,
  },
  splashTag: {
    position: 'absolute',
    bottom: 38,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.muted2,
  },
  // Hero
  hero: {
    backgroundColor: C.charcoal,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: C.goldLight,
    fontWeight: '600',
  },
  h1: { fontSize: 24, fontWeight: '600', letterSpacing: -0.4, color: C.charcoal, lineHeight: 30 },
  sub: { color: C.muted, fontSize: 13.5, lineHeight: 20 },
  // Auth
  authWrap: { flex: 1, backgroundColor: C.cream, paddingHorizontal: 22, justifyContent: 'space-between', paddingTop: 40, paddingBottom: 40 },
  authHero: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 40 },
  authLogo: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.gold,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 30,
    elevation: 6,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.lineStrong },
  dividerText: { color: C.muted2, fontSize: 12, letterSpacing: 1 },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: C.lineStrong,
  },
  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: C.charcoal, padding: 0 },
  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31,31,31,0.05)',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.charcoal },
  // Chat
  chatSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 14,
  },
  msg: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-end' },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.charcoal,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  composerWrap: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.cream,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.lineStrong,
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
  },
  composerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 4,
    fontSize: 14.5,
    color: C.charcoal,
    maxHeight: 132,
    minHeight: 22,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.gold,
  },
  // Star pill
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFCF2',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.32)',
  },
  // Modals
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31,31,31,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 22,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(31,31,31,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.15)',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  // Empty state
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIco: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.15)',
  },
  // Compare
  compare: { flexDirection: 'row', gap: 10 },
  compareLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  // Admin
  kpiCard: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.muted,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: 6,
    color: C.charcoal,
    fontVariant: ['tabular-nums'],
  },
});

export default App;
