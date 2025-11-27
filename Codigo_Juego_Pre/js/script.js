const socket = io({ reconnection: true, reconnectionDelay: 3000 });

console.log('📦 script.js cargado');


/* 2)  Indicador visual del tipo de control (⌨️ / 🎮) */
const ctlStatus = document.getElementById('ctlStatus');   // <span id="ctlStatus">⌨️</span>
function updateCtlIcon(state) {
  if (!ctlStatus) return;
  ctlStatus.textContent = state === 'connected' ? '🎮' : '⌨️';
}
updateCtlIcon('disconnected');   // valor inicial

/* 3)  El servidor avisa cuando un mando entra o sale */
socket.on('controllerStatus', state => {
  updateCtlIcon(state);
  console.log('Estado del mando:', state);
});

/* 4)  Función para enviar un “botón” genérico */
function sendBtn(id) {
  socket.emit('input', { id });     // mismo evento que usa el ESP32
}



const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const flash = document.getElementById('flash');
const usernameInput = document.getElementById('username');
const registerButton = document.getElementById('registerButton');
const startButton = document.getElementById('startButton');
const difficultyButton = document.getElementById('difficultyButton');
const replayButton = document.getElementById('replayButton');
const backToStartButton = document.getElementById('backToStartButton');
const leaderboardTableBody = document.getElementById('leaderboard').querySelector('tbody');
const showLeaderboardButton = document.getElementById('showLeaderboardButton');
const leaderboardSection = document.getElementById('leaderboardSection'); // Sección de la tabla
const backToStartButtonLeaderboard = document.getElementById('backToStartButtonLeaderboard'); // Botón de volver al inicio desde la tabla
const selectTableButton = document.getElementById('customTableModeButton');
const tableSelection = document.getElementById('tableSelection');
const multiplicationTableSelect = document.getElementById('multiplicationTable');
const confirmTableButton = document.getElementById('confirmTableButton');
const selectedTableMessage = document.getElementById('selectedTableMessage');
const exitCustomModeButton = document.getElementById('exitCustomModeButton');
const btnCustomMode   = document.getElementById('customTableModeButton');
const selTableDiv     = document.getElementById('tableSelection');
const confirmTableBtn = document.getElementById('confirmTableButton');
const exitCustomBtn   = document.getElementById('exitCustomModeButton');
const selTable        = document.getElementById('multiplicationTable');
const msgTable        = document.getElementById('selectedTableMessage');



const cloud = { x: 300, y: 150, width: 100, height: 50 };
let questionActive = false; // Flag to control the pause during question
let timeLeft = 10; // Time for answering the question

let customMode   = false;
let customTable  = 2;  // valor por defecto

let startTime = 0;
let elapsedTime = 0;

let totalQuestions = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;

let gameStartTime = null;
let gameEndTime = null;

let tablaSeleccionada = null;
let gameMode = 'easy'; // El modo por defecto sigue siendo "easy"

let username = '';
let difficulty = 'easy';
let gameState = 'start';

let questionsList = [];      // Aquí guardaremos las preguntas del servidor

const MAX_QUESTIONS = 20;  // o el número que quieras usar
// Game settings
const bird = { x: 50, y: 150, width: 20, height: 20, gravity: 0.15, lift: -4, velocity: 0 };
let pipes = [];
const pipeWidth = 100;
const gapSize = 275;
let frameCount = 0;
let score = 0;

// Load images
const birdImage = new Image();
birdImage.src = './IMA/bird-removebg-preview.png';

const topPipeImage = new Image();
topPipeImage.src = './IMA/top-removebg-preview.png';

const middlePipeImage = new Image();
middlePipeImage.src = './IMA/middle-removebg-preview.png';

const bottomPipeImage = new Image();
bottomPipeImage.src = './IMA/bottom-removebg-preview.png';

const backgroundImage = new Image();
backgroundImage.src = './IMA/juego-removebg-preview.png';


// Función para actualizar la puntuación de un usuario
const updateScore = async (username, score, time) => {
    try {
        const response = await fetch(`http://localhost:5000/api/users/${username}/score`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score, time }),  // ← añadimos time
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Puntuación actualizada:', data.user);
        } else {
            console.error('Error al actualizar la puntuación:', data.message);
        }
    } catch (error) {
        console.error('Error en la solicitud de actualización:', error);
    }
};

const fetchLeaderboard = async () => {
    try {
        console.log("Fetching leaderboard...");
        const response = await fetch('http://localhost:5000/api/users');
        const data = await response.json();
        
        if (response.ok) {
            leaderboardTableBody.innerHTML = '';
            data.sort((a, b) => b.score - a.score); // Ordenar por puntaje descendente
            data.forEach((user, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${index + 1}</td><td>${user.username}</td><td>${user.score}</td>`;
                leaderboardTableBody.appendChild(row);
            });
        } else {
            console.error('Error al obtener la tabla de clasificación:', data.message);
        }
    } catch (error) {
        console.error('Error en la solicitud de clasificación:', error);
    }
};



// Mostrar la tabla de puntajes desde la pantalla de inicio
showLeaderboardButton.addEventListener('click', async () => {
  await fetchLeaderboard();
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'flex';
});


// Event listeners for buttons
registerButton.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return alert('Por favor, ingresa un nombre de usuario');
  try {
    const u = await registerUser(name);
    username = u.username;
    alert(`¡Registrado como ${username}!`);
  } catch (err) {
    alert(err.message);
  }
});

startButton.addEventListener('click', () => {
  if (username) {
        if (gameMode === 'tablaPersonalizada' && !tablaSeleccionada) {
            alert("Por favor, selecciona una tabla de multiplicar antes de empezar.");
            return;
        }

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        canvas.style.display = 'block';
        gameState = 'playing';

        // 🔹 Reset de métricas del experimento
        score = 0;
        totalQuestions = 0;
        correctAnswers = 0;
        incorrectAnswers = 0;
        gameStartTime = performance.now();
        gameEndTime = null;

        requestAnimationFrame(gameLoop);
    } else {
        alert('Por favor, regístrate primero');
    }
});

replayButton.addEventListener('click', () => {
    resetGame();
    startButton.click(); // Start game after reset
});

backToStartButton.addEventListener('click', () => {
    resetGame();
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'flex';
});


// Botón para el modo "Tabla Personalizada"
selectTableButton.addEventListener('click', () => {
    gameMode = 'tablaPersonalizada'; // Cambia el modo
    tableSelection.style.display = 'block'; // Muestra el selector
    selectedTableMessage.textContent = ''; // Limpia el mensaje anterior
});

// Confirmar la tabla seleccionada
confirmTableButton.addEventListener('click', () => {
    tablaSeleccionada = parseInt(multiplicationTableSelect.value);
    selectedTableMessage.textContent = `Jugarás con la tabla del ${tablaSeleccionada}`;
    tableSelection.style.display = 'none';
});

// Botón de dificultad (Easy / Hard)
difficultyButton.addEventListener('click', () => {
    if (gameMode === 'tablaPersonalizada') {
        alert("Estás en el modo Tabla Personalizada. No puedes cambiar la dificultad.");
        return;
    }

    if (gameMode === 'easy') {
        gameMode = 'hard';
        difficultyButton.textContent = 'Dificultad: Hard';
    } else {
        gameMode = 'easy';
        difficultyButton.textContent = 'Dificultad: Easy';
    }
});

exitCustomModeButton.addEventListener('click', () => {
    gameMode = 'easy'; // ✅ Regresa al modo por defecto (Fácil)
    tablaSeleccionada = null; // ✅ Elimina la selección de tabla personalizada
    tableSelection.style.display = 'none'; // ✅ Oculta el selector de tabla
    selectedTableMessage.textContent = ''; // ✅ Limpia el mensaje de selección

    alert("Modo Tabla Personalizada desactivado. Ahora puedes jugar en modo Fácil o Difícil.");
});

btnCustomMode.addEventListener('click', () => {
  selTableDiv.style.display = 'block';
});

exitCustomBtn.addEventListener('click', () => {
  selTableDiv.style.display = 'none';
});

confirmTableBtn.addEventListener('click', () => {
  customTable = parseInt(selTable.value, 10);
  customMode  = true;
  msgTable.textContent = `Modo tabla personalizada: tabla del ${customTable}`;
  selTableDiv.style.display = 'none';
});

/* 5)  Mapear teclas del teclado a botones virtuales */
document.addEventListener('keydown', e => {
  if (gameState !== 'playing') return;

  if (e.code === 'Space') {                 // ejemplo: saltar
    bird.velocity = bird.lift;
    sendBtn(4);                             // joystick-click
  }
  if (e.code === 'KeyA') sendBtn(0);        // botón A
  if (e.code === 'KeyS') sendBtn(1);        // botón B
  if (e.code === 'KeyD') sendBtn(2);        // botón C
  if (e.code === 'KeyF') sendBtn(3);        // botón D
});

// Al cargar la página, traemos todas las preguntas
(async function loadQuestionsList() {
  try {
    const res = await fetch('/api/questions');
    questionsList = await res.json();
    console.log(`Cargadas ${questionsList.length} preguntas desde el servidor`);
  } catch (e) {
    console.error('Error cargando preguntas:', e);
  }
})();

function endGame() {
  // Deshabilita el canvas y vuelve a mostrar gameOverScreen
  canvas.classList.remove('playing');
  canvas.style.display      = 'none';
  gameOverScreen.style.display  = 'flex';
  // ...
}

function getRandomDBQuestion() {
  if (!questionsList.length) return null;
  // Selecciona una al azar
  const idx = Math.floor(Math.random() * questionsList.length);
  const q = questionsList[idx];
  // q.problem es el enunciado y q.answers es array de { value, isCorrect }
  return { problem: q.problem, answers: q.answers };
}

function checkCloudCollision() {
    // Detener el juego si el pájaro pasa por la nube
    if (bird.x + bird.width > cloud.x && bird.x < cloud.x + cloud.width && !questionActive) {
        questionActive = true; // Activate the question
        showQuestion();
    }
}

function showFlash(type) {
    if (type === 'success') {
        flash.className = 'flash flash-success';
        socket.emit('flash', 'success');
    } else {
        flash.className = 'flash flash-error';
        socket.emit('flash', 'error');
    }
    flash.style.display = 'block';
    setTimeout(() => {
        flash.style.display = 'none';
    }, 100); // El flash parpadeará durante 100ms
}

function drawCloud() {
    ctx.fillStyle = 'white';
    ctx.fillRect(cloud.x, cloud.y, cloud.width, cloud.height); // Dibuja la nube
}


function showQuestion() {
  clearInterval(gameInterval);

  // Obtener del servidor si hay preguntas; si no, fallback a generateProblem()
  const dbQ = getRandomDBQuestion();
  const { problem, answers } = dbQ ?? generateProblem();

  displayQuestion(problem, answers.map(a => a.value));

  // Guardamos la respuesta correcta para checkAnswer()
  window.currentCorrect = dbQ
    ? answers.find(a => a.isCorrect).value
    : answers.answer; // o define cómo extraerla de tu objeto

  // Inicia tu cuenta atrás igual que antes…
  let countdown = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      hideQuestion();
      resumeGame();
    }
  }, 1000);
}


function displayQuestion(questionText, options) {
    document.getElementById("question").innerText = questionText;
    document.getElementById("options").innerHTML = options.map(option => `<button onclick="checkAnswer('${option}')">${option}</button>`).join('');
}

function hideQuestion() {
    document.getElementById("question").innerText = '';
    document.getElementById("options").innerHTML = '';
}

function checkAnswer(selected) {
  // `selected` llega como texto; conviértelo a número
  if (Number(selected) === Number(window.currentCorrect)) {
    score++;
    showFlash('success');
  } else {
    showFlash('error');
  }
  hideQuestion();
  resumeGame();
}

function renderLeaderboard(list) {
  const tbody = document.querySelector('#leaderboard tbody');
  tbody.innerHTML = '';
  list.forEach((u, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${u.username}</td>
      <td>${u.score}</td>
      <td>${formatTime(u.time)}</td>  <!-- ← mostramos el tiempo formateado -->
    `;
    tbody.appendChild(tr);
  });
}

function resumeGame() {
    questionActive = false;
    timeLeft = 10; // Restablecer el tiempo
    gameInterval = setInterval(updateGame, 16); // Reanudar el intervalo del juego
}


function resetGame() {
    bird.y = 150;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    gameState = 'start';
    startScreen.style.display = 'flex';
    canvas.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // ✅ Enviar solo la señal al Arduino para resetear la pantalla LCD
    socket.emit('resetGame');
}

// Generate random multiplication problems based on difficulty
function generateProblem() {
    let num1, num2, correctAnswer;
    
    if (gameMode === 'tablaPersonalizada' && tablaSeleccionada) {
        num1 = tablaSeleccionada; // ✅ Se asegura de usar la tabla seleccionada
        num2 = Math.floor(Math.random() * 9) + 1;
    } else if (gameMode === 'easy') {
        num1 = Math.floor(Math.random() * 9) + 1;
        num2 = Math.floor(Math.random() * 9) + 1;
    } else if (gameMode === 'hard') {
        num1 = Math.floor(Math.random() * 90) + 10;
        num2 = Math.random() < 0.5 ? 2 : 3;
    }

    correctAnswer = num1 * num2;
    
    let wrongAnswer;
    do {
        if (gameMode === 'tablaPersonalizada') {
            // ✅ Asegura que la respuesta incorrecta esté cerca de la correcta
            wrongAnswer = correctAnswer + (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
        } else if (difficulty === 'easy') {
            wrongAnswer = correctAnswer + (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
        } else {
            wrongAnswer = Math.floor(Math.random() * 1000);
        }
    } while (wrongAnswer === correctAnswer || wrongAnswer < 0);
    return { 
        problem: `${num1} x ${num2}`, 
        answers: [
            { value: correctAnswer, isCorrect: true }, 
            { value: wrongAnswer, isCorrect: false }
        ].sort(() => Math.random() - 0.5) 
    };
}

function drawGameOverScreen() {
  gameOverScreen.style.display = 'flex';
    canvas.style.display = 'none';

    const totalTimeSeconds = gameStartTime && gameEndTime
        ? ((gameEndTime - gameStartTime) / 1000).toFixed(2)
        : 0;

    document.getElementById('finalScore').innerText =
        `Score: ${score}
Tiempo: ${totalTimeSeconds} s
Preguntas: ${totalQuestions}
Correctas: ${correctAnswers}
Incorrectas: ${incorrectAnswers}`;

    document.getElementById('finalName').innerText = `Player: ${username}`;

    // Actualizar puntuación en backend (si quieres seguir usando esto)
    updateScore(username, score);

    // Si más adelante haces un endpoint específico para resultados del experimento:
    /*
    fetch('http://localhost:5000/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            tiempo: totalTimeSeconds,
            preguntas: totalQuestions,
            correctas: correctAnswers,
            incorrectas: incorrectAnswers
        })
    });
    */

    fetchLeaderboard();

}

// Modificar el evento para solo reiniciar el juego si ambos botones fueron presionados
let replayPressed = false;
let backToStartPressed = false;

replayButton.addEventListener('click', () => {
    replayPressed = true;
    checkRestartConditions();
});

backToStartButton.addEventListener('click', () => {
    backToStartPressed = true;
    checkRestartConditions();
});

function getRandomProblem() {
  if (customMode) {
    const b = Math.ceil(Math.random() * 10); // oprímelo a 1–10 o al rango que quieras
    return {
      problem: `${customTable} × ${b}`,
      answer: customTable * b
    };
  }
  // … aquí tu lógica anterior de fácil/medio/difícil …
}

// Solo reinicia el juego si ambos botones fueron presionados
function checkRestartConditions() {
    if (replayPressed && backToStartPressed) {
        resetGame();
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        replayPressed = false;
        backToStartPressed = false;
    }
}


// Game loop
function gameLoop() {
    if (gameState === 'playing') {
        frameCount++;

        // Draw the background image
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

        // Bird physics
        const delta = 1 / 60;  // equivalente a 60 fps “constantes”
bird.velocity += bird.gravity * delta * 60;
bird.y += bird.velocity * delta * 60;

        // Draw bird
        ctx.drawImage(birdImage, bird.x, bird.y, bird.width, bird.height);

        // Generate and draw pipes with math problems
        if (frameCount % 500 === 0) {
            const minTopHeight = 60;        // altura mínima del tubo superior
    const middleSolidHeight = 80;   // grosor del tubo del medio
    const minBottomHeight = 60;     // altura mínima del tubo inferior

    // altura máxima permitida para que todo quepa en pantalla
    const maxTopHeight = canvas.height - (2 * gapSize + middleSolidHeight + minBottomHeight);

    // altura del tubo superior (entre minTopHeight y maxTopHeight)
    const upperPipeHeight = Math.floor(
        Math.random() * (maxTopHeight - minTopHeight) + minTopHeight
    );

    // fin del primer hueco + tubo del medio
    const middlePipeHeight = upperPipeHeight + gapSize + middleSolidHeight;

    // inicio del tubo inferior (después del segundo hueco)
    const lowerPipeY = middlePipeHeight + gapSize;

    const problem = generateProblem();
    const pipeX = canvas.width;

    pipes.push({
        x: pipeX,
        upperHeight: upperPipeHeight,
        middleHeight: middlePipeHeight,
        lowerY: lowerPipeY,
        problem
    });
        }

        // VELOCIDAD PARA LOS TUBOS
        pipes.forEach(pipe => {
// Inicializar si no existe
    if (pipe.evaluated === undefined) {
        pipe.evaluated = false;
    }

    // Movimiento del tubo
    pipe.x -= 1;

    // --- EVALUAR LA RESPUESTA UNA SOLA VEZ ---
    if (
        bird.x < pipe.x + pipeWidth &&
        bird.x + bird.width > pipe.x &&
        !pipe.evaluated
    ) {
        pipe.evaluated = true;
        totalQuestions++;

        let correcta = false;

        // Zona superior
        if (
            bird.y > pipe.upperHeight &&
            bird.y < pipe.middleHeight &&
            pipe.problem.answers[0].isCorrect
        ) {
            correcta = true;
        }

        // Zona inferior
        else if (
            bird.y > pipe.middleHeight &&
            bird.y < pipe.lowerY &&
            pipe.problem.answers[1].isCorrect
        ) {
            correcta = true;
        }

        if (correcta) {
            correctAnswers++;
            score++;
            showFlash('success');
        } else {
            incorrectAnswers++;
            showFlash('error');
        }
    }

    // --- COLISIÓN REAL CON EL TUBO SÓLIDO ---
    if (
        bird.x < pipe.x + pipeWidth &&
        bird.x + bird.width > pipe.x &&
        (bird.y < pipe.upperHeight || bird.y + bird.height > pipe.lowerY)
    ) {
        gameEndTime = performance.now();
        showFlash('error');
        return drawGameOverScreen();
    }

    // --- DIBUJAR TUBOS ---
    ctx.drawImage(topPipeImage, pipe.x, 0, pipeWidth, pipe.upperHeight);

    ctx.drawImage(
        middlePipeImage,
        pipe.x,
        pipe.upperHeight + gapSize,
        pipeWidth,
        pipe.middleHeight - (pipe.upperHeight + gapSize)
    );

    ctx.drawImage(
        bottomPipeImage,
        pipe.x,
        pipe.lowerY,
        pipeWidth,
        canvas.height - pipe.lowerY
    );

    // --- DIBUJAR PROBLEMA ---
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText(pipe.problem.problem, pipe.x + 10, 50);

    // --- DIBUJAR RESPUESTAS ---
    const middleOfTopGap =
        (pipe.upperHeight + (pipe.middleHeight - pipe.upperHeight) / 2) - 10;

    const middleOfBottomGap =
        (pipe.middleHeight + (pipe.lowerY - pipe.middleHeight) / 2) - 10;

    ctx.fillText(pipe.problem.answers[0].value, pipe.x + 10, middleOfTopGap);
    ctx.fillText(pipe.problem.answers[1].value, pipe.x + 10, middleOfBottomGap);
        });

        // Draw score
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText(`Score: ${score}`, 10, 50);

        // Ground collision only
        if (bird.y + bird.height > canvas.height) {
            gameEndTime = performance.now();
    showFlash('error');
    return drawGameOverScreen();
        }

        // Remove offscreen pipes
        pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);

        requestAnimationFrame(gameLoop);
    //} else if (gameState === 'over') {
    //    drawGameOverScreen();
    }
}

// ─── CRUD de preguntas ────────────────────────────────────────────────────────
const btnManageQ    = document.getElementById('manageQuestionsButton');
const adminPanel    = document.getElementById('adminPanel');
const qList         = document.getElementById('questionList');
const qForm         = document.getElementById('questionForm');
const qText         = document.getElementById('qText');
const ansContainer  = document.getElementById('answersContainer');
const addAnsBtn     = document.getElementById('addAnswerBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editingId     = document.getElementById('editingId');

// Mostrar/ocultar panel
btnManageQ.addEventListener('click', () => {
  adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
  if (adminPanel.style.display === 'block') loadQuestions();
});

// Agregar nueva fila de respuesta
addAnsBtn.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'answerRow';
  row.innerHTML = `
    <input type="text" class="ansValue" placeholder="Respuesta" />
    <label><input type="checkbox" class="ansCorrect" /> Correcta</label>
  `;
  ansContainer.appendChild(row);
});

// Cancelar edición
cancelEditBtn.addEventListener('click', () => {
  qForm.reset();
  editingId.value = '';
});

// Cargar preguntas del servidor
async function loadQuestions() {
  qList.innerHTML = 'Cargando…';
  const res = await fetch('/api/questions');
  const questions = await res.json();
  qList.innerHTML = '';
  questions.forEach(q => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${q.problem}</strong>
      <button data-id="${q._id}" class="editQ">✏️</button>
      <button data-id="${q._id}" class="delQ">🗑️</button>
    `;
    qList.appendChild(li);
  });

  // Delegación de eventos
  document.querySelectorAll('.editQ').forEach(b => {
    b.onclick = () => startEdit(b.dataset.id, questions.find(x=>x._id===b.dataset.id));
  });
  document.querySelectorAll('.delQ').forEach(b => {
    b.onclick = async () => {
      await fetch(`/api/questions/${b.dataset.id}`, { method: 'DELETE' });
      loadQuestions();
    };
  });
}

async function registerUser(name) {
  // 1) Usa ruta relativa para no atarte a localhost:5000
  const res  = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: name })
  });
  const data = await res.json();

  // 2) Caso OK (201 Created)
  if (res.ok) {
    // data === { username, score, time, _id, ... }
    return { username: data.username };
  }

  // 3) Error 400 por falta de username
  if (res.status === 400 && data.message === 'Username required') {
    alert('Por favor, ingresa un nombre de usuario');
    return null;   // abortamos el login
  }

  // 4) Error 400 por usuario duplicado → login válido
  if (res.status === 400 && data.message === 'Username exists') {
    return { username: name };
  }

  // 5) Cualquier otro error
  throw new Error(data.message || 'Error desconocido en registro');
}
document.addEventListener('DOMContentLoaded', () => {
  const usernameInput  = document.getElementById('username');
  const registerButton = document.getElementById('registerButton');
  const startButton    = document.getElementById('startButton');
  let username = null;

  registerButton.addEventListener('click', async e => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return alert('Ingresa un nombre de usuario');

    try {
    const result = await registerUser(name);
    if (!result) return;                 // en caso de 'Username required'
    username = result.username;
    alert(`Conectado como ${username}`);
    startButton.disabled = false;
  } catch (err) {
    alert(`No se pudo conectar: ${err.message}`);
  }
});
});
//async function updateScore(name, sc, time) {
  //const res = await fetch(`/api/users/${name}/score`, {
    //method: 'PUT',
    //headers: { 'Content-Type': 'application/json' },
    //body: JSON.stringify({ score: sc, time })
  //});
  //const data = await res.json();
  //if (!res.ok) throw new Error(data.message || 'Error actualizando puntuación');
  //return data;
//}

//async function fetchLeaderboard() {
  //const res = await fetch('/api/users');
  //if (!res.ok) throw new Error('Error fetching leaderboard');
  //const list = await res.json();
  // ordénalo por score↓, time↑
  //list.sort((a, b) => (b.score - a.score) || (a.time - b.time));
  //const tbody = document.querySelector('#leaderboard tbody');
  //tbody.innerHTML = '';
  //list.forEach((u, i) => {
    //const tr = document.createElement('tr');
    //tr.innerHTML = `
      //<td>${i+1}</td>
      //<td>${u.username}</td>
      //<td>${u.score}</td>
      //<td>${u.time}s</td>
    //`;
    //tbody.appendChild(tr);
  //});
//}

// Iniciar edición
function startEdit(id, q) {
  editingId.value = id;
  qText.value     = q.problem;
  ansContainer.innerHTML = '';
  q.answers.forEach(a => {
    const row = document.createElement('div');
    row.className = 'answerRow';
    row.innerHTML = `
      <input type="text" class="ansValue" value="${a.value}" />
      <label><input type="checkbox" class="ansCorrect" ${a.isCorrect?'checked':''} /> Correcta</label>
    `;
    ansContainer.appendChild(row);
  });
}

// Guardar (crear o actualizar)
qForm.addEventListener('submit', async e => {
  e.preventDefault();
  const answers = Array.from(ansContainer.querySelectorAll('.answerRow')).map(r => ({
    value: Number(r.querySelector('.ansValue').value),
    isCorrect: !!r.querySelector('.ansCorrect').checked
  }));
  const payload = { problem: qText.value, answers };
  const id = editingId.value;
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/questions/${id}` : '/api/questions';
  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  qForm.reset();
  editingId.value = '';
  loadQuestions();
});


if (gameState === 'start') {
    startScreen.style.display = 'flex';
    canvas.style.display = 'none';
    gameOverScreen.style.display = 'none';
} else if (gameState === 'playing') {
    startScreen.style.display = 'none';
    canvas.style.display = 'block';
    gameLoop();
}
