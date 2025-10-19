// ==================== FIREBASE CONFIGURATION ====================
// Firebase SDK v10.7.1 - Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ✅ Configuração do Firebase - Nelly Tech
const firebaseConfig = {
    apiKey: "AIzaSyCclVB4CMlOhjYYvh5u4CrqPbqj-1YLZZA",
    authDomain: "nelly-tech.firebaseapp.com",
    projectId: "nelly-tech",
    storageBucket: "nelly-tech.appspot.com", 
    messagingSenderId: "193427877277",
    appId: "1:193427877277:web:84ea640f1c090bb3369374"
};

// Variáveis globais
let app, auth, db, storage;
let isInitialized = false;

// ==================== INICIALIZAÇÃO ====================

function initializeFirebase() {
    try {
        // Inicializar Firebase App
        app = initializeApp(firebaseConfig);
        
        // Inicializar serviços
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        isInitialized = true;
        
        console.log('✅ Firebase inicializado com sucesso!');
        console.log('📊 Projeto:', firebaseConfig.projectId);
        
        // Atualizar status visual se elemento existir
        updateFirebaseStatus('✅ Conectado', '#10b981');
        
        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('firebaseReady', { 
            detail: { app, auth, db, storage } 
        }));
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        console.error('Detalhes:', {
            code: error.code,
            message: error.message
        });
        
        updateFirebaseStatus('❌ Erro na conexão', '#ef4444');
        
        // Tentar novamente após 3 segundos
        setTimeout(() => {
            console.log('🔄 Tentando reconectar...');
            initializeFirebase();
        }, 3000);
        
        return false;
    }
}

// ==================== UTILITÁRIOS ====================

function updateFirebaseStatus(text, color) {
    const statusElement = document.getElementById('firebaseStatus');
    if (statusElement) {
        statusElement.textContent = text;
        if (color) {
            statusElement.style.color = color;
        }
    }
}

// Verificar se Firebase está pronto
function isFirebaseReady() {
    return isInitialized && app && auth && db && storage;
}

// Obter informações do Firebase
function getFirebaseInfo() {
    if (!isFirebaseReady()) {
        return {
            initialized: false,
            error: 'Firebase não inicializado'
        };
    }
    
    return {
        initialized: true,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        version: '10.7.1',
        appVersion: '1.0.0'
    };
}

// Aguardar inicialização do Firebase
function waitForFirebase(timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (isFirebaseReady()) {
            resolve({ auth, db, storage, app });
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (isFirebaseReady()) {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                resolve({ auth, db, storage, app });
            }
        }, 100);
        
        const timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Timeout ao aguardar inicialização do Firebase'));
        }, timeout);
    });
}

// ==================== TRATAMENTO DE ERROS ====================

function handleFirebaseError(error, context = '') {
    console.error(`❌ Erro Firebase${context ? ` (${context})` : ''}:`, error);
    
    const errorMessages = {
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-email': 'Email inválido.',
        'auth/email-already-in-use': 'Email já cadastrado.',
        'auth/weak-password': 'Senha muito fraca. Use no mínimo 6 caracteres.',
        'auth/invalid-credential': 'Credenciais inválidas.',
        'permission-denied': 'Permissão negada. Verifique as regras do Firestore.',
        'unavailable': 'Serviço temporariamente indisponível.',
        'not-found': 'Documento não encontrado.',
        'already-exists': 'Documento já existe.',
        'resource-exhausted': 'Cota excedida.',
        'unauthenticated': 'Usuário não autenticado.',
    };
    
    const errorCode = error.code || '';
    const friendlyMessage = errorMessages[errorCode] || error.message || 'Erro desconhecido';
    
    return {
        code: errorCode,
        message: friendlyMessage,
        originalError: error
    };
}

// ==================== MODO DE DESENVOLVIMENTO ====================

// Descomentar para usar emuladores locais (desenvolvimento)
/*
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Modo de desenvolvimento - Usando emuladores Firebase');
    
    try {
        connectAuthEmulator(auth, 'http://localhost:9099');
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        
        console.log('✅ Conectado aos emuladores Firebase');
    } catch (error) {
        console.warn('⚠️ Erro ao conectar emuladores:', error);
    }
}
*/

// ==================== INICIALIZAR ====================

// Inicializar imediatamente
initializeFirebase();

// ==================== EXPORTAÇÕES ====================

export { 
    // Serviços Firebase
    auth, 
    db, 
    storage, 
    app,
    firebaseConfig,
    
    // Utilitários
    isFirebaseReady,
    getFirebaseInfo,
    waitForFirebase,
    handleFirebaseError,
    updateFirebaseStatus
};

// ==================== LOGS ====================

console.log('✅ Firebase Config carregado!');
console.log('📊 Configurações:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    version: '10.7.1',
    environment: window.location.hostname === 'localhost' ? 'development' : 'production'
});

// Tornar disponível globalmente para debug (apenas em desenvolvimento)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.firebaseDebug = {
        getInfo: getFirebaseInfo,
        isReady: isFirebaseReady,
        config: firebaseConfig,
        services: { auth, db, storage, app }
    };
    console.log('🔧 Debug: window.firebaseDebug disponível');
}