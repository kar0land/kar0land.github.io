/* ==========================================================================
   1. ESTADO GLOBAL E DADOS
   ========================================================================== */
let capituloAtual = 1;
let modoNavegacaoAtivo = 'scroll'; 
let modoLeituraAtual = 'normal';

// Variáveis do Modo Acompanhado (TTS)
let ttsNarracaoLigada = true;
let ttsMostrarTexto = true;
let ttsMarcadorLigado = true;
let ttsEstiloDestaque = 'linha'; // 'linha' ou 'palavra'
let ttsVelocidade = 1.0;
let ttsUtterance = null;
let ttsTocando = false;
let ttsIntervaloTimer = null;
let ttsPalavrasEstruturadas = [];
let ttsIndicePalavraGlobal = 0;

// Variáveis do Modo Foco
let focoAtivo = false;
let focoEstilo = 'regua'; // 'regua' ou 'blur'
let focoIntensidadeBlur = 4;
let focoFrasesCapitulo = [];
let focoIndiceFrase = 0;

// Variáveis do Modo RSVP (Leitura Rápida)
let rsvpAtivo = false;
let rsvpPalavras = [];
let rsvpIndice = 0;
let rsvpVelocidadeWPM = 300;
let rsvpIntervalo = null;
let rsvpTocando = false;

// Variáveis do Pomodoro
const popupPomodoro = document.getElementById('pomodoro-popup');
let timerInterval;
let timeLeft = 25 * 60; 
let isRunning = false;

// Elementos Principais do DOM
const contentArea = document.getElementById('leitura-scroll');
const textContainer = document.querySelector('.text-container');
const panel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');

// Dados dos Capítulos
const dadosCapitulos = [
    { id: 1, nome: "Capítulo 1", titulo: "Em que Sophie conversa com chapéus", progresso: 5, pagina: 10 },
    { id: 2, nome: "Capítulo 2", titulo: "Em que Sophie é forçada a fazer-se à vida", progresso: 15, pagina: 45 },
    { id: 3, nome: "Capítulo 3", titulo: "Em que Sophie entra num castelo e num negócio", progresso: 30, pagina: 90 },
    { id: 4, nome: "Capítulo 4", titulo: "Em que Sophie descobre várias coisas estranhas", progresso: 45, pagina: 135 },
    { id: 5, nome: "Capítulo 5", titulo: "Onde há limpezas e mais limpezas", progresso: 65, pagina: 195 },
    { id: 6, nome: "Capítulo 6", titulo: "Em que Howl expressa os seus sentimentos com lodo verde", progresso: 85, pagina: 255 }
];

/* ==========================================================================
   2. NAVEGAÇÃO E CAPÍTULOS
   ========================================================================== */
function inicializarDropdownCapitulos() {
    const lista = document.getElementById('chapters-list');
    lista.innerHTML = '';
    dadosCapitulos.forEach(cap => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.onclick = () => mudarCapitulo(cap.id);
        div.innerHTML = `
            <div class="chapter-meta">${cap.nome}</div>
            <div class="chapter-name">${cap.titulo}</div>
            <div class="chapter-progress-row">
                <div class="mini-track"><div class="mini-fill" style="width: ${cap.progresso}%;"></div></div>
                <span class="mini-percent">${cap.progresso}%</span>
            </div>
        `;
        lista.appendChild(div);
    });
}

function mudarCapitulo(id) {
    pararTTS();
    pararFoco();
    pararRSVP();
    capituloAtual = id;

    document.querySelectorAll('.chapter-section').forEach(sec => sec.classList.remove('active'));
    const secAtiva = document.getElementById(`cap-${id}`);
    if (secAtiva) secAtiva.classList.add('active');

    estruturarPalavrasNoCapitulo();
    prepararFrasesFoco();
    prepararRSVP();

    const info = dadosCapitulos.find(c => c.id === id);
    if (info) {
        document.getElementById('header-book-title').innerText = info.nome;
        document.getElementById('audiobook-chapter-text').innerText = `${info.nome} : ${info.titulo}`;
        document.getElementById('footer-progress-fill').style.width = info.progresso + '%';
        document.getElementById('footer-page-text').innerText = `Página ${info.pagina} / 301`;
        document.getElementById('footer-percent-text').innerText = info.progresso + '%';
    }

    contentArea.scrollTop = 0;

    const jaGuardado = document.querySelector(`[data-capitulo-id="${id}"]`);
    const btnIcon = document.getElementById('bookmark-icon-btn');
    if (btnIcon) {
        btnIcon.innerText = jaGuardado ? 'bookmark_added' : 'bookmark_border';
    }

    if (modoLeituraAtual === 'acompanhado') {
        iniciarTTS();
    } else if (modoLeituraAtual === 'foco') {
        iniciarFoco();
    } else if (modoLeituraAtual === 'rsvp') {
        iniciarRSVP();
    }
}

function sairDoLivro() { 
    alert("A voltar para a biblioteca..."); 
}

/* ==========================================================================
   3. GESTÃO DOS MODOS DE LEITURA
   ========================================================================== */
function mudarModoLeitura(modo, elementoCard) {
    modoLeituraAtual = modo;
    
    const parentContainer = elementoCard.closest('.tab-section');
    parentContainer.querySelectorAll('.option-card').forEach(card => {
        if (card.id !== 'card-acompanhado' && card.id !== 'card-foco' && card.id !== 'card-rsvp') {
            card.classList.remove('active');
        }
    });
    
    const cardAcompanhado = document.getElementById('card-acompanhado');
    const opcoesAcompanhado = document.getElementById('opcoes-acompanhado');
    const cardFoco = document.getElementById('card-foco');
    const opcoesFoco = document.getElementById('opcoes-foco');
    const cardRsvp = document.getElementById('card-rsvp');
    const opcoesRsvp = document.getElementById('opcoes-rsvp');
    const playerBar = document.getElementById('tts-player-bar');
    const textContainer = document.getElementById('texto-livro');
    const audiobookView = document.getElementById('audiobook-view');
    const rsvpView = document.getElementById('rsvp-view');

    cardAcompanhado.classList.remove('active');
    opcoesAcompanhado.style.display = 'none';
    cardFoco.classList.remove('active');
    opcoesFoco.style.display = 'none';
    cardRsvp.classList.remove('active');
    opcoesRsvp.style.display = 'none';

    pararTTS();
    pararFoco();
    pararRSVP();
    removerDestaquesTTS();
    ttsIndicePalavraGlobal = 0;

    document.body.classList.remove('focus-mode-active');
    textContainer.style.display = 'block';
    audiobookView.style.display = 'none';
    rsvpView.style.display = 'none';

    if (modo === 'acompanhado') {
        cardAcompanhado.classList.add('active');
        opcoesAcompanhado.style.display = 'block';
        playerBar.style.display = 'flex';
        estruturarPalavrasNoCapitulo();
        iniciarTTS();
    } else if (modo === 'foco') {
        cardFoco.classList.add('active');
        opcoesFoco.style.display = 'block';
        playerBar.style.display = 'flex';
        iniciarFoco();
    } else if (modo === 'rsvp') {
        cardRsvp.classList.add('active');
        opcoesRsvp.style.display = 'block';
        playerBar.style.display = 'flex';
        textContainer.style.display = 'none';
        audiobookView.style.display = 'none';
        rsvpView.style.display = 'flex';
        iniciarRSVP();
    } else {
        playerBar.style.display = 'none';
        elementoCard.classList.add('active');
    }
}

/* --- 3.1 Modo Acompanhado (TTS) --- */
function estruturarPalavrasNoCapitulo() {
    const secAtiva = document.getElementById(`cap-${capituloAtual}`);
    if (!secAtiva) return;

    const elementos = secAtiva.querySelectorAll('p, h1, h2');
    ttsPalavrasEstruturadas = [];

    elementos.forEach(el => {
        if (!el.dataset.estruturado) {
            let palavras = el.innerText.trim().split(/\s+/);
            el.innerHTML = palavras.map(w => w.trim() ? `<span class="tts-word">${w}</span>` : '').join(' ');
            el.dataset.estruturado = "true";
        }
        
        let spans = el.querySelectorAll('.tts-word');
        spans.forEach(s => {
            ttsPalavrasEstruturadas.push({ span: s, elementoPai: el });
        });
    });
}

function iniciarTTS(reiniciarDoIndiceAtual = false) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (ttsIntervaloTimer) {
        clearInterval(ttsIntervaloTimer);
        ttsIntervaloTimer = null;
    }

    const secAtiva = document.getElementById(`cap-${capituloAtual}`);
    if (!secAtiva) return;

    estruturarPalavrasNoCapitulo();
    if (ttsPalavrasEstruturadas.length === 0) return;

    // Se não for um reinício de mudança de velocidade, começa do início
    if (!reiniciarDoIndiceAtual) {
        ttsIndicePalavraGlobal = 0;
    }

    // Pega no restante texto a partir da palavra atual
    const palavrasRestantes = ttsPalavrasEstruturadas.slice(ttsIndicePalavraGlobal);
    if (palavrasRestantes.length === 0) return;

    const textoCompleto = palavrasRestantes.map(item => item.span.innerText).join(" ");

    if (ttsNarracaoLigada && 'speechSynthesis' in window) {
        ttsUtterance = new SpeechSynthesisUtterance(textoCompleto);
        ttsUtterance.rate = ttsVelocidade;
        ttsUtterance.lang = 'pt-PT';

        ttsUtterance.onstart = () => {
            ttsTocando = true;
            const playIcon = document.getElementById('tts-play-icon');
            if (playIcon) playIcon.innerText = 'pause';
        };

        // Sincronização em tempo real exata com o motor de áudio
        ttsUtterance.onboundary = (event) => {
            if (event.name !== 'word' || !ttsTocando) return;

            // Calcula o índice da palavra falada com base na posição do caractere (charIndex)
            const textoAteAqui = textoCompleto.substring(0, event.charIndex);
            const palavrasPassadas = textoAteAqui.trim().length > 0 ? textoAteAqui.trim().split(/\s+/).length : 0;
            const indiceReal = ttsIndicePalavraGlobal + palavrasPassadas;

            if (indiceReal < ttsPalavrasEstruturadas.length) {
                aplicarDestaqueTTS(ttsPalavrasEstruturadas[indiceReal]);
            }
        };

        ttsUtterance.onend = () => {
            ttsTocando = false;
            const playIcon = document.getElementById('tts-play-icon');
            if (playIcon) playIcon.innerText = 'play_arrow';
            removerDestaquesTTS();
            ttsIndicePalavraGlobal = 0;
        };

        window.speechSynthesis.speak(ttsUtterance);
    } else {
        // Fallback caso a narração de voz esteja desligada: temporizador proporcional
        ttsTocando = true;
        const playIcon = document.getElementById('tts-play-icon');
        if (playIcon) playIcon.innerText = 'pause';

        let tempoPorPalavra = Math.max(160, 320 / ttsVelocidade);
        ttsIntervaloTimer = setInterval(() => {
            if (!ttsTocando) return;

            if (ttsIndicePalavraGlobal < ttsPalavrasEstruturadas.length) {
                aplicarDestaqueTTS(ttsPalavrasEstruturadas[ttsIndicePalavraGlobal]);
                ttsIndicePalavraGlobal++;
            } else {
                pararTTS();
            }
        }, tempoPorPalavra);
    }
}

function aplicarDestaqueTTS(item) {
    if (!ttsMarcadorLigado || !ttsMostrarTexto || !item) return;

    if (ttsEstiloDestaque === 'palavra') {
        removerDestaquesPalavraTTS();
        esconderOverlayLinhaTTS();
        item.span.classList.add('tts-highlight-word');
    } else {
        removerDestaquesPalavraTTS();
        destacarLinhaInteiraTTS(item);
    }

    // Gestão de visibilidade coordenada entre Scroll e Swipe
    if (modoNavegacaoAtivo === 'swipe') {
        ajustarPaginaSwipeSeNecessario(item.span);
    } else {
        // Só faz scroll vertical suave se a linha estiver a sair da zona de conforto visual
        const spanRect = item.span.getBoundingClientRect();
        const areaRect = contentArea.getBoundingClientRect();
        if (spanRect.top < areaRect.top + 60 || spanRect.bottom > areaRect.bottom - 100) {
            recentralizarTextoCentroTopo(item.span);
        }
    }
}

function ajustarPaginaSwipeSeNecessario(spanPalavra) {
    if (!spanPalavra || !textContainer) return;

    const containerRect = textContainer.getBoundingClientRect();
    const spanRect = spanPalavra.getBoundingClientRect();
    const larguraPagina = textContainer.clientWidth;

    // Tolerância de 5px para evitar viragens prematuras nas pontas
    if (spanRect.right > containerRect.right + 5 || spanRect.left < containerRect.left - 5) {
        const offsetRelativo = spanRect.left - containerRect.left + textContainer.scrollLeft;
        const indicePaginaAlvo = Math.round(offsetRelativo / larguraPagina);

        textContainer.scrollTo({
            left: indicePaginaAlvo * larguraPagina,
            top: 0, /* Garante que o topo vertical fica sempre fixo e sem corte */
            behavior: 'smooth'
        });
    }
}

function recentralizarTextoCentroTopo(elementoSpan) {
    if (!elementoSpan || !contentArea) return;

    // Calcula a distância do elemento relativamente ao topo de contentArea
    const spanRect = elementoSpan.getBoundingClientRect();
    const areaRect = contentArea.getBoundingClientRect();

    // Posiciona o elemento a cerca de 30% do topo da área de leitura (zona centro-topo ideal)
    const distanciaAtual = spanRect.top - areaRect.top;
    const alvoTopo = contentArea.clientHeight * 0.3;
    const diferenca = distanciaAtual - alvoTopo;

    contentArea.scrollBy({
        top: diferenca,
        behavior: 'smooth'
    });
}

function destacarLinhaInteiraTTS(itemAtual) {
    const overlayLinha = document.getElementById('tts-line-overlay');
    if (!overlayLinha || !itemAtual || !itemAtual.span) return;

    const yLinha = itemAtual.span.offsetTop;
    const palavrasDaLinha = ttsPalavrasEstruturadas.filter(item => 
        item.elementoPai === itemAtual.elementoPai && Math.abs(item.span.offsetTop - yLinha) < 6
    );

    if (palavrasDaLinha.length === 0) return;

    const primeira = palavrasDaLinha[0].span;
    const ultima = palavrasDaLinha[palavrasDaLinha.length - 1].span;

    const containerRect = textContainer.getBoundingClientRect();
    const primRect = primeira.getBoundingClientRect();
    const ultRect = ultima.getBoundingClientRect();

    // Usa contentArea.scrollTop para compensar a rolagem vertical
    const scrollV = contentArea ? contentArea.scrollTop : 0;
    const scrollH = textContainer.scrollLeft || 0;

    const left = primRect.left - containerRect.left + scrollH - 4;
    const top = primRect.top - containerRect.top + scrollV - 2;
    const width = (ultRect.right - primRect.left) + 8;
    const height = Math.max(primRect.height, ultRect.height) + 4;

    overlayLinha.style.left = `${left}px`;
    overlayLinha.style.top = `${top}px`;
    overlayLinha.style.width = `${width}px`;
    overlayLinha.style.height = `${height}px`;
    overlayLinha.style.display = 'block';
}

function esconderOverlayLinhaTTS() {
    const overlayLinha = document.getElementById('tts-line-overlay');
    if (overlayLinha) overlayLinha.style.display = 'none';
}

function removerDestaquesPalavraTTS() {
    document.querySelectorAll('.tts-highlight-word').forEach(el => {
        el.classList.remove('tts-highlight-word');
    });
}

function removerDestaquesTTS() {
    esconderOverlayLinhaTTS();
    removerDestaquesPalavraTTS();
    document.querySelectorAll('.tts-highlight-line').forEach(el => {
        el.classList.remove('tts-highlight-line', 'tts-line-start', 'tts-line-end');
    });
}

function pararTTS() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (ttsIntervaloTimer) {
        clearInterval(ttsIntervaloTimer);
        ttsIntervaloTimer = null;
    }
    ttsTocando = false;
    const icon = document.getElementById('tts-play-icon');
    if (icon) icon.innerText = 'play_arrow';
    removerDestaquesTTS();
}

function togglePlayTTS() {
    if (modoLeituraAtual === 'foco') {
        if (ttsTocando) {
            ttsTocando = false;
            document.getElementById('tts-play-icon').innerText = 'play_arrow';
        } else {
            ttsTocando = true;
            document.getElementById('tts-play-icon').innerText = 'pause';
        }
        return;
    }

    if (modoLeituraAtual === 'rsvp') {
        if (rsvpTocando) {
            rsvpTocando = false;
            if (rsvpIntervalo) clearInterval(rsvpIntervalo);
            document.getElementById('tts-play-icon').innerText = 'play_arrow';
        } else {
            rsvpTocando = true;
            document.getElementById('tts-play-icon').innerText = 'pause';
            lancarCicloRSVP();
        }
        return;
    }

    if (ttsTocando) {
        if (ttsNarracaoLigada && 'speechSynthesis' in window) window.speechSynthesis.pause();
        ttsTocando = false;
        if (ttsIntervaloTimer) clearInterval(ttsIntervaloTimer);
        document.getElementById('tts-play-icon').innerText = 'play_arrow';
    } else {
        if (ttsNarracaoLigada && 'speechSynthesis' in window && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            ttsTocando = true;
            document.getElementById('tts-play-icon').innerText = 'pause';
        } else {
            iniciarTTS();
        }
    }
}

function ttsAvancar() {
    if (modoLeituraAtual === 'foco') {
        ttsAvancarFoco();
        return;
    }
    if (modoLeituraAtual === 'rsvp') {
        rsvpAvancar();
        return;
    }
    if (capituloAtual < dadosCapitulos.length) {
        mudarCapitulo(capituloAtual + 1);
    }
}

function ttsRecuar() {
    if (modoLeituraAtual === 'foco') {
        ttsRecuarFoco();
        return;
    }
    if (modoLeituraAtual === 'rsvp') {
        rsvpRecuar();
        return;
    }
    if (capituloAtual > 1) {
        mudarCapitulo(capituloAtual - 1);
    }
}

function toggleNarracao() {
    ttsNarracaoLigada = document.getElementById('tgl-narracao').checked;
    iniciarTTS();
}

function toggleMostrarTexto() {
    ttsMostrarTexto = document.getElementById('tgl-mostrar-texto').checked;
    const textContainer = document.getElementById('texto-livro');
    const audiobookView = document.getElementById('audiobook-view');
    const grupoDestaque = document.getElementById('grupo-estilo-destaque');
    const btnLinha = document.getElementById('btn-estilo-linha');
    const btnPalavra = document.getElementById('btn-estilo-palavra');

    if (ttsMostrarTexto) {
        textContainer.style.display = 'block';
        audiobookView.style.display = 'none';
        grupoDestaque.classList.remove('disabled-options');
        btnLinha.style.pointerEvents = 'auto';
        btnPalavra.style.pointerEvents = 'auto';
    } else {
        textContainer.style.display = 'none';
        audiobookView.style.display = 'flex';
        grupoDestaque.classList.add('disabled-options');
        btnLinha.style.pointerEvents = 'none';
        btnPalavra.style.pointerEvents = 'none';
        removerDestaquesTTS();
    }
}

function toggleMarcador() {
    ttsMarcadorLigado = document.getElementById('tgl-marcador').checked;
    if (!ttsMarcadorLigado) removerDestaquesTTS();
}

function mudarEstiloDestaque(estilo, elementoDiv) {
    ttsEstiloDestaque = estilo;
    elementoDiv.parentNode.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
    elementoDiv.classList.add('active');
}

function mudarVelocidadeTTS(vel) {
    ttsVelocidade = parseFloat(vel);
    const speedLabel = document.getElementById('tts-speed-val');
    if (speedLabel) speedLabel.innerText = vel + 'x';

    // Se estiver a tocar, reinicia a voz na velocidade nova sem perder a posição do texto
    if (ttsTocando) {
        iniciarTTS(true);
    }
}

/* --- 3.2 Modo Foco --- */
function prepararFrasesFoco() {
    const secAtiva = document.getElementById(`cap-${capituloAtual}`);
    if (!secAtiva) return;

    const elementos = secAtiva.querySelectorAll('p, h1, h2');
    focoFrasesCapitulo = [];

    elementos.forEach(el => {
        let frases = el.innerText.match(/[^.!?]+[.!?]+(\s|$)/g) || [el.innerText];
        frases.forEach(f => {
            let fLimpa = f.trim();
            if (fLimpa.length > 0) {
                focoFrasesCapitulo.push({ elemento: el, texto: fLimpa });
            }
        });
    });
}

function iniciarFoco() {
    focoAtivo = true;
    document.body.classList.add('focus-mode-active');
    prepararFrasesFoco();
    focoIndiceFrase = 0;
    atualizarVisualFoco();
}

function pararFoco() {
    focoAtivo = false;
    document.body.classList.remove('focus-mode-active');
    document.querySelectorAll('.text-container p, .text-container h1, .text-container h2').forEach(el => {
        el.classList.remove('focus-blurred');
        el.classList.remove('focus-active-sentence');
        el.style.opacity = '';
    });
}

function mudarEstiloFoco(estilo, elementoDiv) {
    focoEstilo = estilo;
    elementoDiv.parentNode.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
    elementoDiv.classList.add('active');

    const sliderContainer = document.getElementById('container-blur-slider');
    sliderContainer.style.display = (estilo === 'blur') ? 'block' : 'none';
    atualizarVisualFoco();
}

function mudarIntensidadeBlur(val) {
    focoIntensidadeBlur = val;
    document.getElementById('blur-val').innerText = val + 'px';
    document.documentElement.style.setProperty('--blur-intensity', val + 'px');
}

function atualizarVisualFoco() {
    if (!focoAtivo || focoFrasesCapitulo.length === 0) return;

    const elementos = document.querySelectorAll('.text-container p, .text-container h1, .text-container h2');
    
    elementos.forEach(el => {
        if (focoEstilo === 'blur') {
            el.classList.add('focus-blurred');
        } else {
            el.classList.remove('focus-blurred');
            el.style.opacity = '0.35';
        }
        el.classList.remove('focus-active-sentence');
    });

    let atual = focoFrasesCapitulo[focoIndiceFrase];
    if (atual && atual.elemento) {
        atual.elemento.classList.remove('focus-blurred');
        atual.elemento.style.opacity = '1';
        atual.elemento.classList.add('focus-active-sentence');
        atual.elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function ttsAvancarFoco() {
    if (focoIndiceFrase < focoFrasesCapitulo.length - 1) {
        focoIndiceFrase++;
        atualizarVisualFoco();
    } else if (capituloAtual < dadosCapitulos.length) {
        mudarCapitulo(capituloAtual + 1);
    }
}

function ttsRecuarFoco() {
    if (focoIndiceFrase > 0) {
        focoIndiceFrase--;
        atualizarVisualFoco();
    } else if (capituloAtual > 1) {
        mudarCapitulo(capituloAtual - 1);
        focoIndiceFrase = focoFrasesCapitulo.length - 1;
        atualizarVisualFoco();
    }
}

/* --- 3.3 Modo RSVP (Leitura Rápida) --- */
function prepararRSVP() {
    const secAtiva = document.getElementById(`cap-${capituloAtual}`);
    if (!secAtiva) return;
    rsvpPalavras = secAtiva.innerText.split(/\s+/).filter(w => w.trim().length > 0);
    rsvpIndice = 0;
}

function calcularORPIndex(palavra) {
    let n = palavra.length;
    if (n <= 3) return 0; 
    if (n <= 5) return 1; 
    if (n <= 9) return 2; 
    return 3; 
}

function renderizarPalavraORP(palavra) {
    if (!palavra) return "";
    let idx = calcularORPIndex(palavra);
    let antes = palavra.substring(0, idx);
    let orp = palavra.charAt(idx);
    let depois = palavra.substring(idx + 1);
    return `${antes}<span class="rsvp-orp">${orp}</span>${depois}`;
}

function iniciarRSVP() {
    rsvpAtivo = true;
    prepararRSVP();
    rsvpIndice = 0;
    rsvpTocando = true;
    document.getElementById('tts-play-icon').innerText = 'pause';
    atualizarVisualRSVP();
    lancarCicloRSVP();
}

function pararRSVP() {
    rsvpAtivo = false;
    rsvpTocando = false;
    if (rsvpIntervalo) clearInterval(rsvpIntervalo);
    const icon = document.getElementById('tts-play-icon');
    if (icon) icon.innerText = 'play_arrow';
}

function atualizarVisualRSVP() {
    if (rsvpPalavras.length === 0) return;
    let palavraAtual = rsvpPalavras[rsvpIndice] || "";
    document.getElementById('rsvp-display-box').innerHTML = renderizarPalavraORP(palavraAtual);
    document.getElementById('rsvp-counter').innerText = `Palavra ${rsvpIndice + 1} de ${rsvpPalavras.length}`;
}

function lancarCicloRSVP() {
    if (rsvpIntervalo) clearInterval(rsvpIntervalo);
    let msPorPalavra = (60000 / rsvpVelocidadeWPM);

    rsvpIntervalo = setInterval(() => {
        if (!rsvpTocando || !rsvpAtivo) return;
        if (rsvpIndice < rsvpPalavras.length - 1) {
            rsvpIndice++;
            atualizarVisualRSVP();
        } else {
            rsvpTocando = false;
            clearInterval(rsvpIntervalo);
            document.getElementById('tts-play-icon').innerText = 'play_arrow';
        }
    }, msPorPalavra);
}

function mudarVelocidadeRSVP(wpm) {
    rsvpVelocidadeWPM = parseInt(wpm);
    document.getElementById('rsvp-speed-val').innerText = wpm + ' WPM';
    if (rsvpTocando) lancarCicloRSVP();
}

function rsvpAvancar() {
    if (rsvpIndice < rsvpPalavras.length - 1) {
        rsvpIndice++;
        atualizarVisualRSVP();
    } else if (capituloAtual < dadosCapitulos.length) {
        mudarCapitulo(capituloAtual + 1);
    }
}

function rsvpRecuar() {
    if (rsvpIndice > 0) {
        rsvpIndice--;
        atualizarVisualRSVP();
    } else if (capituloAtual > 1) {
        mudarCapitulo(capituloAtual - 1);
        rsvpIndice = rsvpPalavras.length - 1;
        atualizarVisualRSVP();
    }
}

/* ==========================================================================
   4. NAVEGAÇÃO POR GESTO (SWIPE), VISIBILIDADE E TECLADO
   ========================================================================== */
let touchStartX = 0;
let touchEndX = 0;

// Ocultar barras de navegação (apenas ao clicar na zona central)
contentArea.addEventListener('click', (e) => {
    if (modoLeituraAtual === 'rsvp' || window.getSelection().toString().length > 0 || e.target.closest('button') || e.target.closest('#highlight-popup')) {
        return;
    }

    const larguraEcra = contentArea.clientWidth;
    const clickX = e.clientX - contentArea.getBoundingClientRect().left;

    // Se estiver em modo swipe e clicou nas laterais para avançar/recuar, não esconde a interface
    if (modoNavegacaoAtivo === 'swipe' && (clickX < larguraEcra * 0.25 || clickX > larguraEcra * 0.75)) {
        return;
    }

    document.body.classList.toggle('hide-ui');
});

// Toque táctil (Touch)
contentArea.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

contentArea.addEventListener('touchend', e => {
    if (modoNavegacaoAtivo !== 'swipe') return; 
    touchEndX = e.changedTouches[0].screenX;
    const diferenca = touchStartX - touchEndX;
    
    if (diferenca > 40) {
        saltarPaginaOuCapitulo(1);
    } else if (diferenca < -40) {
        saltarPaginaOuCapitulo(-1);
    }
}, { passive: true });

// Clique com o rato nas laterais em Modo Swipe (esquerda = recuar, direita = avançar)
contentArea.addEventListener('click', e => {
    if (modoNavegacaoAtivo !== 'swipe') return; 
    if (e.target.closest('button') || e.target.closest('#highlight-popup') || window.getSelection().toString().length > 0) {
        return;
    }

    const larguraEcra = contentArea.clientWidth;
    const cliqueX = e.clientX - contentArea.getBoundingClientRect().left;

    if (cliqueX > larguraEcra * 0.75) {
        saltarPaginaOuCapitulo(1);
    } else if (cliqueX < larguraEcra * 0.25) {
        saltarPaginaOuCapitulo(-1);
    }
});

function saltarPaginaOuCapitulo(direcao) {
    if (modoNavegacaoAtivo === 'swipe') {
        const larguraPagina = textContainer.clientWidth;
        const scrollAtual = textContainer.scrollLeft;
        const maxScroll = textContainer.scrollWidth - textContainer.clientWidth;

        if (direcao === 1) {
            // Avança uma página
            if (scrollAtual < maxScroll - 10) {
                textContainer.scrollBy({ left: larguraPagina, behavior: 'smooth' });
            } else if (capituloAtual < dadosCapitulos.length) {
                mudarCapitulo(capituloAtual + 1);
            }
        } else {
            // Recua uma página
            if (scrollAtual > 10) {
                textContainer.scrollBy({ left: -larguraPagina, behavior: 'smooth' });
            } else if (capituloAtual > 1) {
                mudarCapitulo(capituloAtual - 1);
                setTimeout(() => { 
                    textContainer.scrollLeft = textContainer.scrollWidth; 
                }, 50);
            }
        }
    } else {
        // Modo Scroll tradicional (vertical)
        const clientHeight = contentArea.clientHeight;
        const scrollTop = contentArea.scrollTop;
        const maxScroll = contentArea.scrollHeight - clientHeight;

        if (direcao === 1) {
            if (scrollTop < maxScroll - 10) {
                contentArea.scrollBy({ top: clientHeight * 0.8, behavior: 'smooth' });
            } else if (capituloAtual < dadosCapitulos.length) {
                mudarCapitulo(capituloAtual + 1);
            }
        } else {
            if (scrollTop > 10) {
                contentArea.scrollBy({ top: -clientHeight * 0.8, behavior: 'smooth' });
            } else if (capituloAtual > 1) {
                mudarCapitulo(capituloAtual - 1);
                setTimeout(() => { 
                    contentArea.scrollTop = contentArea.scrollHeight; 
                }, 50);
            }
        }
    }
}

// Navegação por teclado global
document.addEventListener('keydown', e => {
    if (modoLeituraAtual === 'foco') {
        if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowRight') {
            e.preventDefault();
            ttsAvancarFoco();
        } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'ArrowLeft') {
            e.preventDefault();
            ttsRecuarFoco();
        }
    } else if (modoLeituraAtual === 'rsvp') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            rsvpAvancar();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            rsvpRecuar();
        } else if (e.key === ' ') {
            e.preventDefault();
            togglePlayTTS();
        }
    } else if (modoLeituraAtual === 'acompanhado') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            ttsAvancar();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            ttsRecuar();
        }
    } else {
        // Modo Leitura Normal: responde a setas conforme o modo ativo (scroll ou swipe)
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            saltarPaginaOuCapitulo(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            saltarPaginaOuCapitulo(-1);
        }
    }
});

/* ==========================================================================
   5. DEFINIÇÕES DE ASPETO (FONTES, TEMAS E SLIDERS)
   ========================================================================== */
function abrirDefinicoes() { 
    panel.classList.add('open'); 
    overlay.classList.add('active'); 
    fecharPomodoro(); 
}

function fecharDefinicoes() { 
    panel.classList.remove('open'); 
    overlay.classList.remove('active'); 
}

function mudarAba(idAba) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('aba-' + idAba).classList.add('active');
    event.currentTarget.classList.add('active');
}

function mudarFonte(fonteFamily, el) {
    document.getElementById('texto-livro').style.fontFamily = fonteFamily;
    document.querySelectorAll('#aba-texto .option-card').forEach(card => card.classList.remove('active'));
    el.classList.add('active');
}

function mudarTamanhoFonte(val) {
    document.documentElement.style.setProperty('--leitura-font-size', val + 'px');
    document.getElementById('font-size-val').innerText = val + 'px';
}

function mudarAlturaLinha(val) {
    document.documentElement.style.setProperty('--leitura-line-height', val);
    document.getElementById('line-height-val').innerText = val;
}

function mudarMargens(val) {
    document.documentElement.style.setProperty('--leitura-margem', val + 'px');
    document.getElementById('margin-val').innerText = val + 'px';
}

function atualizarCorSlider(slider) {
    const min = slider.min || 0; 
    const max = slider.max || 100; 
    const val = slider.value;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #2c2416 ${pct}%, #f0f0f0 ${pct}%)`;
}

function aplicarTema(fundo, texto, el) {
    document.documentElement.style.setProperty('--bg-color', '#' + fundo);
    document.documentElement.style.setProperty('--text-color', '#' + texto);
    document.querySelectorAll('#aba-tema .option-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
}

function mudarModoNavegacao(modo, el) {
    modoNavegacaoAtivo = modo;
    document.body.setAttribute('data-nav', modo);
    el.parentNode.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');

    // Se estiver em modo de leitura acompanhada a tocar, recentraliza a palavra atual
    if (modoLeituraAtual === 'acompanhado' && ttsTocando && ttsPalavrasEstruturadas.length > 0) {
        const itemAtual = ttsPalavrasEstruturadas[ttsIndicePalavraGlobal];

        // Aguarda a aplicação das alterações do CSS antes de recalcular a geometria
        setTimeout(() => {
            if (modo === 'scroll') {
                textContainer.scrollLeft = 0;
                if (itemAtual && itemAtual.span) {
                    recentralizarTextoCentroTopo(itemAtual.span);
                    if (ttsEstiloDestaque === 'linha') {
                        destacarLinhaInteiraTTS(itemAtual);
                    }
                }
            } else if (modo === 'swipe') {
                contentArea.scrollTop = 0;
                if (itemAtual && itemAtual.span) {
                    ajustarPaginaSwipeSeNecessario(itemAtual.span);
                    if (ttsEstiloDestaque === 'linha') {
                        destacarLinhaInteiraTTS(itemAtual);
                    }
                }
            }
        }, 50);
    } else {
        // Comportamento normal se não houver leitura áudio em curso
        contentArea.scrollTop = 0;
        textContainer.scrollLeft = 0;
    }
}

/* ==========================================================================
   6. DESTAQUES (HIGHLIGHTS) E MARCADORES (BOOKMARKS)
   ========================================================================== */
const highlightPopup = document.getElementById('highlight-popup');
const savedHighlightsList = document.getElementById('saved-highlights');
const emptyState = document.getElementById('empty-highlights');
let currentRange = null;

function showPopup(x, y) {
    highlightPopup.style.left = `${x}px`;
    highlightPopup.style.top = `${y}px`;
    highlightPopup.style.display = 'block';
}

function hidePopup() { 
    highlightPopup.style.display = 'none'; 
}

function applyHighlight(colorName) {
    if (currentRange) {
        const uniqueId = 'hl-' + Date.now();
        const span = document.createElement('span');
        span.className = `highlight-${colorName}`;
        span.id = uniqueId; 
        try {
            const content = currentRange.extractContents();
            span.appendChild(content);
            currentRange.insertNode(span);
            addSavedHighlight(span.textContent, colorName, uniqueId);
        } catch(e) {}
        window.getSelection().removeAllRanges();
        currentRange = null;
    }
    hidePopup();
}

function addSavedHighlight(text, colorName, uniqueId) {
    if (emptyState) emptyState.style.display = 'none'; 
    const listItem = document.createElement('li');
    listItem.className = `note-item note-${colorName}`; 
    listItem.innerHTML = `
        <span class="item-text-content">"${text}"</span>
        <button class="delete-item-btn" onclick="removeHighlight('${uniqueId}', this)" title="Apagar">
            <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
        </button>
    `;
    savedHighlightsList.appendChild(listItem);
}

function removeHighlight(id, btnElement) {
    const span = document.getElementById(id);
    if (span) {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
    }
    btnElement.closest('li').remove();
    if (savedHighlightsList.querySelectorAll('li').length === 0 && emptyState) {
        emptyState.style.display = 'block';
    }
}

// Escuta seleção de texto
textContainer.addEventListener('mouseup', function(e) {
    setTimeout(() => { 
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
            currentRange = sel.getRangeAt(0).cloneRange(); 
            const rect = currentRange.getBoundingClientRect(); 
            showPopup(rect.left + rect.width / 2, rect.top);
        } else if (!e.target.closest('#highlight-popup')) {
            hidePopup();
            currentRange = null;
        }
    }, 10);
});

highlightPopup.querySelectorAll('.popup-color').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', function() { applyHighlight(this.getAttribute('data-color')); });
});

document.addEventListener('mousedown', function(e) {
    if (highlightPopup.style.display === 'block' && !e.target.closest('#highlight-popup') && !e.target.closest('.text-container')) {
        hidePopup();
        currentRange = null;
    }
});

// Guardar e remover marcadores (Bookmarks)
function guardarCapitulo() {
    const info = dadosCapitulos.find(c => c.id === capituloAtual);
    const tituloCompleto = `${info.nome}: ${info.titulo}`;
    const bookmarkList = document.getElementById('saved-bookmarks');
    const emptyBookmarks = document.getElementById('empty-bookmarks');

    if (document.querySelector(`[data-capitulo-id="${capituloAtual}"]`)) return;

    if (emptyBookmarks) emptyBookmarks.style.display = 'none';

    const uniqueId = 'bm-' + Date.now();
    const listItem = document.createElement('li');
    listItem.className = 'bookmark-item';
    listItem.setAttribute('data-capitulo-id', capituloAtual);
    listItem.innerHTML = `
        <span class="item-text-content" onclick="mudarCapitulo(${capituloAtual})">${tituloCompleto}</span>
        <button class="delete-item-btn" onclick="removerBookmark('${uniqueId}', ${capituloAtual}, this)" title="Apagar marcador">
            <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
        </button>
    `;
    bookmarkList.appendChild(listItem);

    const btnIcon = document.getElementById('bookmark-icon-btn');
    if (btnIcon) btnIcon.innerText = 'bookmark_added';
}

function removerBookmark(id, capituloId, btnElement) {
    const listItem = btnElement.closest('li');
    listItem.remove();
    
    if (capituloAtual === capituloId) {
        const btnIcon = document.getElementById('bookmark-icon-btn');
        if (btnIcon) btnIcon.innerText = 'bookmark_border';
    }

    const bookmarkList = document.getElementById('saved-bookmarks');
    const emptyBookmarks = document.getElementById('empty-bookmarks');
    if (bookmarkList.querySelectorAll('li').length === 0 && emptyBookmarks) {
        emptyBookmarks.style.display = 'block';
    }
}

/* ==========================================================================
   7. POMODORO E SONS DE FUNDO
   ========================================================================== */
function abrirPomodoro() { 
    popupPomodoro.style.display = 'block'; 
    fecharDefinicoes(); 
}

function fecharPomodoro() { 
    popupPomodoro.style.display = 'none'; 
}

function mudarAbaPomo(aba) {
    document.querySelectorAll('.pomo-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.pomo-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('pomo-aba-' + aba).classList.add('active');
    event.currentTarget.classList.add('active');
}

function atualizarDisplayTimer() {
    let minutos = Math.floor(timeLeft / 60);
    let segundos = timeLeft % 60;
    document.getElementById('timer-display').innerText = 
        (minutos < 10 ? '0' : '') + minutos + ':' + (segundos < 10 ? '0' : '') + segundos;
}

function toggleTimer() {
    const btnStart = document.getElementById('btn-timer-start');
    if (isRunning) {
        clearInterval(timerInterval);
        btnStart.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">play_arrow</span> Start';
        isRunning = false;
    } else {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) { 
                timeLeft--; 
                atualizarDisplayTimer(); 
            } else { 
                clearInterval(timerInterval); 
                isRunning = false; 
                alert("Tempo de Foco concluído!"); 
            }
        }, 1000);
        btnStart.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">pause</span> Pause';
        isRunning = true;
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = 25 * 60;
    atualizarDisplayTimer();
    document.getElementById('btn-timer-start').innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">play_arrow</span> Start';
}

function selecionarMusica(el) {
    document.querySelectorAll('.musica-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

/* ==========================================================================
   8. INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    inicializarDropdownCapitulos();
    document.querySelectorAll('input[type=range]').forEach(atualizarCorSlider);
});


/* ==========================================================================
   9. BARRA DE NAVEGAÇÃO
   ========================================================================== */
   function atualizarBarraProgresso() {
            const contentArea = document.getElementById('leitura-scroll');
            
            if (modoNavegacaoAtivo === 'swipe') {
                // Cálculo para o modo Swipe (horizontal)
                const scrollLeft = contentArea.scrollLeft;
                const maxScrollLeft = contentArea.scrollWidth - contentArea.clientWidth;
                const percentagem = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * 100 : 0;
                
                // Atualiza a largura visual da barra de preenchimento
                document.getElementById('footer-progress-fill').style.width = percentagem + '%';
                
                // Atualiza o texto da percentagem no rodapé
                document.getElementById('footer-percent-text').innerText = Math.round(percentagem) + '%';
            } else {
                // Cálculo para o modo Scroll (vertical)
                const scrollTop = contentArea.scrollTop;
                const scrollHeight = contentArea.scrollHeight - contentArea.clientHeight;
                const percentagem = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
                
                // Atualiza a largura visual da barra de preenchimento
                document.getElementById('footer-progress-fill').style.width = percentagem + '%';
                
                // Atualiza o texto da percentagem no rodapé
                document.getElementById('footer-percent-text').innerText = Math.round(percentagem) + '%';
            }
        }

        // Coloca a função a escutar sempre que fazes scroll ou mudas de tamanho de janela
let emTransicaoCapitulo = false; // Variável de bloqueio

        document.getElementById('leitura-scroll').addEventListener('scroll', function() {
            const contentArea = this;
            
            // Só executa no modo Scroll e se não estiver já a transitar de capítulo
            if (modoNavegacaoAtivo === 'scroll' && !emTransicaoCapitulo) {
                const scrollTop = contentArea.scrollTop;
                const scrollHeight = contentArea.scrollHeight;
                const clientHeight = contentArea.clientHeight;

                // Se chegou ao fundo (com uma margem de segurança de 10 pixels)
                if (scrollTop + clientHeight >= scrollHeight - 10) {
                    if (typeof capituloAtual !== 'undefined' && capituloAtual < dadosCapitulos.length) {
                        emTransicaoCapitulo = true; // Ativa o bloqueio
                        
                        setTimeout(() => {
                            mudarCapitulo(capituloAtual + 1);
                            contentArea.scrollTop = 0; // Vai para o topo do novo capítulo
                            
                            // Liberta o bloqueio passado meio segundo para permitir o próximo capítulo no futuro
                            setTimeout(() => {
                                emTransicaoCapitulo = false;
                            }, 500);
                        }, 100);
                    }
                }
            }
        });

        window.addEventListener('resize', atualizarBarraProgresso);