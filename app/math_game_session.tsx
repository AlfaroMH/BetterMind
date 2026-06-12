import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "./utils/auth-context";
import { saveLevelProgress } from "./utils/database/level-progress";
import { soundManager } from "./utils/sound-manager";

export default function MathGameSession() {
  const router = useRouter();
  const { gameId, level, gameTitle } = useLocalSearchParams();
  const { activeChild } = useAuth();
  
  const currentLevel = parseInt(level as string);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionErrors, setSessionErrors] = useState(0);
  const [question, setQuestion] = useState({ num1: '' as any, num2: '' as any, operation: '', answer: '' as any });
  const [options, setOptions] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutos en segundos
  const [timeExpired, setTimeExpired] = useState(false);

  // Estados para el Plano Cartesiano
  const [targetCoord, setTargetCoord] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 }); // En coordenadas del plano
  const pan = useRef(new Animated.ValueXY()).current;
  const PLANE_SIZE = 280;
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const errorsRef = useRef(0);
  
  // Sincronizar refs con estado para usar en el cleanup o callbacks de tiempo
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { errorsRef.current = sessionErrors; }, [sessionErrors]);

  const TOTAL_QUESTIONS = 10;

  const FRACTION_WORDS: Record<number, string> = {
    2: 'medio',
    3: 'tercio',
    4: 'cuarto',
    5: 'quinto',
    6: 'sexto',
    7: 'séptimo',
    8: 'octavo',
    9: 'noveno',
    10: 'décimo'
  };

  const getFractionName = (numerator: number, denominator: number) => {
    const numWord = NUMBER_WORDS[numerator] || numerator.toString();
    const denWord = FRACTION_WORDS[denominator] || `${denominator}avo`;
    return `${numWord} ${denWord}${numerator > 1 ? 's' : ''}`;
  };
  const NUMBER_WORDS: Record<number, string> = {
    1: 'Un', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete', 8: 'Ocho', 9: 'Nueve', 10: 'Diez'
  };

  const PERCENTAGE_HINTS: Record<number, string> = {
    1: "💡 Tip: Multiplica el número por el porcentaje y divide entre 100.",
    2: "💡 Tip: Las fracciones representan una parte de 100. Ej: 1/2 es la mitad (50%).",
    3: "💡 Tip: En una razón A:B, si A aumenta X veces, B también aumenta X veces."
  };

  const PROPORTION_HINTS: Record<number, string> = {
    1: "💡 Tip: Si 1 unidad cuesta X, 2 unidades cuestan el doble (2 * X).",
    2: "💡 Tip: Encuentra cuánto vale 'uno' dividiendo el total entre la cantidad.",
    3: "💡 Tip: Multiplica cruzado y divide para encontrar el valor faltante."
  };

  const PROBABILITY_HINTS: Record<number, string> = {
    1: "💡 Recuerda: Un dado tiene 6 caras. La probabilidad es (casos favor) / las caras del dado.",
    2: "💡 Tip: Imposible = 0%, Posible = entre 1% y 99%, Seguro = 100%.",
    3: "💡 Tip: Suma los casos favorables y divídelos entre el total de opciones."
  };

  const NEGATIVE_HINTS: Record<number, string> = {
    1: "💡 Tip: En el termómetro, subir es (+) y bajar es (-).",
    2: "💡 Tip: Restar un número negativo es como sumar. Ej: 5 - (-2) = 5 + 2. (Ley de los signos).",
    3: "💡 Tip: Al multiplicar, signos iguales dan (+) y diferentes dan (-)."
  };

  const POWER_HINTS: Record<number, string> = {
    1: "💡 Tip: 2³ significa multiplicar 2 por sí mismo 3 veces: 2 * 2 * 2.",
    2: "💡 Tip: Todo número elevado a la 0 es igual a 1. Ej: 5⁰ = 1.",
    3: "💡 Tip: La raíz cuadrada busca un número que multiplicado por sí mismo dé el total."
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const finishGame = async (reason: 'win' | 'lives' | 'time', finalScoreOverride?: number, finalErrorsOverride?: number) => {
    if (gameOver) return;
    setGameOver(true);
    
    // Detener música de fondo al terminar el juego
    soundManager.stopBackgroundMusic();
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const finalScore = finalScoreOverride !== undefined ? finalScoreOverride : scoreRef.current;
    const finalErrors = finalErrorsOverride !== undefined ? finalErrorsOverride : errorsRef.current;
    const finalTimeTaken = 180 - timeLeft;
    const isPerfect = finalScore === 100;

    if (reason === 'win') setWin(true);
    if (reason === 'time') setTimeExpired(true);

    // Guardar progreso final una sola vez
    if (activeChild) {
      await saveLevelProgress(
        activeChild.child_id, 
        gameId as string, 
        currentLevel, 
        finalScore, 
        isPerfect,
        finalErrors
      );
    }

    // Mostrar alerta según el resultado
    if (reason === 'time') {
      Alert.alert(
        "¡Tiempo Agotado!",
        "El tiempo se ha terminado. ¡Inténtalo de nuevo para completar el nivel!",
        [{ text: "Entendido", onPress: () => router.back() }]
      );
    } else if (reason === 'lives') {
      Alert.alert(
        "Nivel Finalizado",
        `Has perdido todas tus vidas.\n\nTiempo: ${formatTime(finalTimeTaken)}\nPuntaje: ${finalScore}\nErrores: ${finalErrors}\n\n¡Sigue intentándolo!`,
        [{ text: "Volver", onPress: () => router.back() }]
      );
    } else if (reason === 'win') {
      if (isPerfect) {
        Alert.alert(
          "¡Felicidades!",
          `¡Has completado el nivel con éxito!\n\nTiempo: ${formatTime(finalTimeTaken)}\nPuntaje: ${finalScore}\nErrores: ${finalErrors}`,
          [{ text: "¡Genial!", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Nivel Terminado",
          `Has terminado las preguntas, pero necesitas 100 puntos para avanzar.\n\nTiempo: ${formatTime(finalTimeTaken)}\nPuntaje: ${finalScore}\nErrores: ${finalErrors}\n\n¡Sigue intentándolo!`,
          [{ text: "Volver", onPress: () => router.back() }]
        );
      }
    }
  };

  useEffect(() => {
    generateQuestion();
    soundManager.setLowVolume(true);
    
    // Iniciar temporizador
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 11) { // Sonido cuando quedan 10 segundos
          soundManager.playSound('timer');
        }
        if (prev <= 1) {
          soundManager.playSound('fail');
          finishGame('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      soundManager.setLowVolume(false);
    };
  }, []);

  const simplifyFraction = (num: number, den: number) => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const common = gcd(Math.abs(num), den);
    const sNum = num / common;
    const sDen = den / common;
    if (sNum === 0) return '0';
    if (sDen === 1) return sNum.toString();
    return `${sNum}/${sDen}`;
  };

  const generateQuestion = () => {
    if (gameOver) return;
    setProcessing(false);
    let num1, num2, operation, answer;
    
    // Dificultad basada en el nivel
    const max = currentLevel === 1 ? 10 : currentLevel === 2 ? 50 : 100;
    
    if (gameId?.includes('frac_read')) {
      // Lectura de fracciones
      const denominator = Math.floor(Math.random() * 9) + 2; // 2-10
      const numerator = Math.floor(Math.random() * (denominator - 1)) + 1; // 1 to denominator-1
      
      num1 = getFractionName(numerator, denominator);
      num2 = '';
      operation = '';
      answer = `${numerator}/${denominator}`;
      
      const newOptions = [answer];
      while (newOptions.length < 4) {
        const d = Math.floor(Math.random() * 9) + 2;
        const n = Math.floor(Math.random() * (d - 1)) + 1;
        const opt = `${n}/${d}`;
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('negativos')) {
      // Números Negativos (9no Grado)
      if (currentLevel === 1) {
        // Temperaturas y Niveles
        const temp = Math.floor(Math.random() * 20) - 10;
        const change = Math.floor(Math.random() * 10) + 1;
        const up = Math.random() > 0.5;
        num1 = `La temperatura es ${temp}°C. Si ${up ? 'sube' : 'baja'} ${change}°C, ¿cuál es la nueva temperatura?`;
        answer = up ? temp + change : temp - change;
      } else if (currentLevel === 2) {
        // Suma y Resta con negativos
        const n1 = Math.floor(Math.random() * 20) - 10;
        const n2 = Math.floor(Math.random() * 20) - 10;
        const op = Math.random() > 0.5 ? '+' : '-';
        num1 = `${n1} ${op} (${n2})`;
        answer = op === '+' ? n1 + n2 : n1 - n2;
      } else {
        // Multiplicación con negativos
        const n1 = Math.floor(Math.random() * 12) - 6;
        const n2 = Math.floor(Math.random() * 12) - 6;
        num1 = `(${n1}) × (${n2})`;
        answer = n1 * n2;
      }
      
      num2 = '';
      operation = '';
      const newOptions = [answer];
      while (newOptions.length < 4) {
        const opt = answer + (Math.floor(Math.random() * 10) - 5);
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('potencias')) {
      // Potencias y Raíces (9no Grado)
      if (currentLevel === 1) {
        // Potencias cuadradas y cúbicas simples
        const base = Math.floor(Math.random() * 10) + 2;
        const exp = Math.random() > 0.5 ? 2 : 3;
        num1 = `¿Cuánto es ${base}${exp === 2 ? '²' : '³'}?`;
        answer = Math.pow(base, exp);
      } else if (currentLevel === 2) {
        // Exponentes especiales (0, 1) y multiplicaciones repetidas
        const base = Math.floor(Math.random() * 50) + 2;
        const exp = Math.floor(Math.random() * 2);
        num1 = `¿Cuánto es ${base}${exp === 0 ? '⁰' : '¹'}?`;
        answer = Math.pow(base, exp);
      } else {
        // Raíces cuadradas perfectas
        const root = Math.floor(Math.random() * 12) + 1;
        const square = root * root;
        num1 = `¿Cuál es la raíz cuadrada de ${square} (√${square})?`;
        answer = root;
      }

      num2 = '';
      operation = '';
      const newOptions = [answer];
      while (newOptions.length < 4) {
        const opt = Math.max(0, answer + (Math.floor(Math.random() * 10) - 5));
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('proporciones')) {
      // Proporciones (8vo Grado)
      const items = ['manzanas', 'lápices', 'caramelos', 'libros', 'juguetes'];
      const item = items[Math.floor(Math.random() * items.length)];
      
      if (currentLevel === 1) {
        // Doble / Mitad simple
        const q1 = Math.floor(Math.random() * 5) + 1;
        const v1 = q1 * (Math.floor(Math.random() * 5) + 2);
        const factor = Math.random() > 0.5 ? 2 : 3;
        const q2 = q1 * factor;
        num1 = `Si ${q1} ${item} cuestan ${v1} monedas, ¿cuánto cuestan ${q2}?`;
        answer = v1 * factor;
      } else if (currentLevel === 2) {
        // Encontrar valor unitario
        const q1 = [2, 4, 5, 10][Math.floor(Math.random() * 4)];
        const v1 = q1 * (Math.floor(Math.random() * 8) + 3);
        const q2 = Math.floor(Math.random() * 9) + 2;
        num1 = `Si ${q1} ${item} valen ${v1}, ¿cuánto valen ${q2} ${item}?`;
        answer = (v1 / q1) * q2;
      } else {
        // Regla de tres inversa simple o proporciones más complejas
        const q1 = Math.floor(Math.random() * 10) + 5;
        const v1 = Math.floor(Math.random() * 20) + 10;
        const q2 = Math.floor(Math.random() * 5) + 2;
        num1 = `Si ${q1} obreros tardan ${v1} días, ¿cuántos obreros se necesitan para tardar ${q2} días?`;
        answer = Math.round((q1 * v1) / q2);
      }

      num2 = '';
      operation = '';
      const newOptions = [answer];
      while (newOptions.length < 4) {
        const opt = Math.max(1, answer + (Math.floor(Math.random() * 10) - 5));
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('probabilidad')) {
      // Probabilidad Simple (8vo Grado)
      if (currentLevel === 1) {
        // Dados
        const target = Math.floor(Math.random() * 6) + 1;
        const types = ['un número mayor que', 'un número menor que', 'exactamente el número'];
        const typeIdx = Math.floor(Math.random() * 3);
        num1 = `Al lanzar un dado, ¿cuál es la probabilidad de obtener ${types[typeIdx]} ${target}?`;
        
        let favorable = 0;
        for (let i = 1; i <= 6; i++) {
          if (typeIdx === 0 && i > target) favorable++;
          if (typeIdx === 1 && i < target) favorable++;
          if (typeIdx === 2 && i === target) favorable++;
        }
        answer = simplifyFraction(favorable, 6);
      } else if (currentLevel === 2) {
        // Eventos
        const events = [
          { q: 'Que salga un 7 en un dado de 6 caras', a: 'Imposible' },
          { q: 'Que mañana salga el sol', a: 'Seguro' },
          { q: 'Que salga cara al lanzar una moneda', a: 'Posible' },
          { q: 'Que un gato hable español', a: 'Imposible' }
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        num1 = `¿Qué tipo de evento es: "${ev.q}"?`;
        answer = ev.a;
        setOptions(['Seguro', 'Posible', 'Imposible'].sort(() => Math.random() - 0.5));
        setQuestion({ num1, num2: '', operation: '', answer });
        return;
      } else {
        // Urnas / Canicas
        const r = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 5) + 1;
        const total = r + b;
        num1 = `En una bolsa hay ${r} canicas rojas y ${b} azules. ¿Probabilidad de sacar una roja?`;
        answer = simplifyFraction(r, total);
      }

      num2 = '';
      operation = '';
      const newOptions = [answer];
      while (newOptions.length < 4) {
        const n = Math.floor(Math.random() * 10);
        const d = Math.floor(Math.random() * 10) + 1;
        const opt = simplifyFraction(n, d);
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('frac_ops')) {
      // Operaciones con fracciones (mismo denominador para niveles 1-2, diferente para 3)
      const den = Math.floor(Math.random() * 8) + 2;
      let n1, n2, d1, d2;
      
      if (currentLevel < 3) {
        d1 = d2 = den;
        n1 = Math.floor(Math.random() * 5) + 1;
        n2 = Math.floor(Math.random() * 5) + 1;
      } else {
        d1 = Math.floor(Math.random() * 4) + 2;
        d2 = Math.floor(Math.random() * 4) + 2;
        n1 = Math.floor(Math.random() * 3) + 1;
        n2 = Math.floor(Math.random() * 3) + 1;
      }

      operation = Math.random() > 0.5 ? '+' : '-';
      if (operation === '-' && (n1/d1 < n2/d2)) {
        [n1, d1, n2, d2] = [n2, d2, n1, d1];
      }

      num1 = `${n1}/${d1}`;
      num2 = `${n2}/${d2}`;
      
      // Calculate answer
      const finalDen = d1 * d2;
      const finalNum = operation === '+' ? (n1 * d2 + n2 * d1) : (n1 * d2 - n2 * d1);
      
      // Simplify
      answer = simplifyFraction(finalNum, finalDen);

      const newOptions = [answer];
      while (newOptions.length < 4) {
        const n = Math.floor(Math.random() * 10);
        const d = Math.floor(Math.random() * 9) + 2;
        const opt = simplifyFraction(n, d);
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    if (gameId?.includes('plano')) {
      // Plano Cartesiano interactivo
      const range = currentLevel === 1 ? 5 : currentLevel === 2 ? 10 : 15;
      const isNegative = currentLevel > 1;
      
      const x = Math.floor(Math.random() * range) * (isNegative && Math.random() > 0.5 ? -1 : 1);
      const y = Math.floor(Math.random() * range) * (isNegative && Math.random() > 0.5 ? -1 : 1);
      
      setTargetCoord({ x, y });
      // Resetear punto visual al origen (0,0)
      pan.setValue({ x: 0, y: 0 });
      setCurrentPoint({ x: 0, y: 0 });
      
      num1 = `Ubica el punto: (${x}, ${y})`;
      num2 = '';
      operation = '';
      answer = `(${x}, ${y})`;
      setQuestion({ num1, num2, operation, answer });
      setOptions([]); // No usamos opciones de texto para el plano
      return;
    }

    if (gameId?.includes('porcentajes')) {
      // Porcentajes Básicos
      if (currentLevel === 1) {
        // Descuentos simples
        const base = (Math.floor(Math.random() * 10) + 1) * 100;
        const pct = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
        num1 = `¿Cuánto es el ${pct}% de ${base}?`;
        num2 = '';
        operation = '';
        answer = (base * pct) / 100;
      } else if (currentLevel === 2) {
        // Relacionar fracciones a porcentajes
        const pairs = [['1/2', '50%'], ['1/4', '25%'], ['1/5', '20%'], ['1/10', '10%'], ['3/4', '75%']];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        num1 = `¿A qué porcentaje equivale ${pair[0]}?`;
        num2 = '';
        operation = '';
        answer = pair[1];
      } else {
        // Razones simples
        const r1 = Math.floor(Math.random() * 5) + 1;
        const r2 = Math.floor(Math.random() * 5) + 1;
        const factor = Math.floor(Math.random() * 3) + 2;
        num1 = `Si la razón es ${r1}:${r2}, y tengo ${r1 * factor} rojos, ¿cuántos azules hay?`;
        num2 = '';
        operation = '';
        answer = r2 * factor;
      }

      const newOptions = [answer];
      while (newOptions.length < 4) {
        let opt;
        if (typeof answer === 'string') {
          opt = `${Math.floor(Math.random() * 100)}%`;
        } else {
          opt = answer + (Math.floor(Math.random() * 10) - 5);
          if (opt < 0) opt = answer + 5;
        }
        if (!newOptions.includes(opt)) newOptions.push(opt);
      }
      setQuestion({ num1, num2, operation, answer });
      setOptions(newOptions.sort(() => Math.random() - 0.5));
      return;
    }

    // Operaciones básicas (suma, resta, multi, divi)
    num1 = Math.floor(Math.random() * max) + 1;
    num2 = Math.floor(Math.random() * max) + 1;

    if (gameId?.includes('suma')) operation = '+';
    else if (gameId?.includes('resta')) {
      operation = '-';
      if (num1 < num2) [num1, num2] = [num2, num1];
    }
    else if (gameId?.includes('multi')) {
      operation = '×';
      num1 = Math.floor(Math.random() * (currentLevel * 5)) + 1;
      num2 = Math.floor(Math.random() * (currentLevel * 5)) + 1;
    }
    else {
      operation = '÷';
      num2 = Math.floor(Math.random() * (currentLevel * 5)) + 1;
      num1 = num2 * (Math.floor(Math.random() * 10) + 1);
    }

    answer = operation === '+' ? num1 + num2 : 
             operation === '-' ? num1 - num2 :
             operation === '×' ? num1 * num2 : num1 / num2;

    const newOptions = [answer];
    while (newOptions.length < 4) {
      const opt = answer + (Math.floor(Math.random() * 10) - 5);
      if (!newOptions.includes(opt) && opt >= 0) newOptions.push(opt);
    }
    
    setQuestion({ num1, num2, operation, answer });
    setOptions(newOptions.sort(() => Math.random() - 0.5));
  };

  const handleAnswer = async (selected: any) => {
    if (gameOver || processing) return;
    setProcessing(true);

    const isCorrect = selected === question.answer;
    
    // Reproducir sonido de respuesta
    if (isCorrect) {
      soundManager.playSound('correct');
    } else {
      soundManager.playSound('incorrect');
    }

    await processAnswer(isCorrect);
  };

  const processAnswer = async (isCorrect: boolean) => {
    if (isCorrect) {
      const newScore = score + 10; 
      setScore(newScore);
      const nextCount = questionCount + 1;
      
      if (nextCount >= TOTAL_QUESTIONS) {
        soundManager.playSound('success');
        finishGame('win', newScore);
      } else {
        setQuestionCount(nextCount);
        generateQuestion();
      }
    } else {
      const newLives = lives - 1;
      const newErrors = sessionErrors + 1;
      setLives(newLives);
      setSessionErrors(newErrors);
      
      if (newLives <= 0) {
        soundManager.playSound('fail');
        finishGame('lives', score, newErrors);
      } else {
        generateQuestion();
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Limitar movimiento al tamaño del plano
        const range = currentLevel === 1 ? 5 : currentLevel === 2 ? 10 : 15;
        const step = PLANE_SIZE / (range * 2);
        
        let newX = gestureState.dx;
        let newY = gestureState.dy;

        // Snapping (opcional para mayor precisión)
        const gridX = Math.round(newX / step);
        const gridY = Math.round(-newY / step); // Eje Y invertido en pantalla

        if (Math.abs(gridX) <= range && Math.abs(gridY) <= range) {
          pan.setValue({ x: gridX * step, y: -gridY * step });
          setCurrentPoint({ x: gridX, y: gridY });
        }
      },
      onPanResponderRelease: () => {
        // El punto se queda donde se soltó
      }
    })
  ).current;

  const handleCheckPlano = async () => {
    if (gameOver || processing) return;
    setProcessing(true);
    const isCorrect = currentPoint.x === targetCoord.x && currentPoint.y === targetCoord.y;
    
    if (isCorrect) {
      soundManager.playSound('correct');
    } else {
      soundManager.playSound('incorrect');
    }

    await processAnswer(isCorrect);
  };

  const handleExit = async () => {
    soundManager.playSound('click');
    if (timerRef.current) clearInterval(timerRef.current);
    // Reiniciar música de fondo al salir
    soundManager.restartBackgroundMusic();
    
    // Solo guardar si el juego no ha terminado por sí solo
    if (activeChild && !gameOver) {
      await saveLevelProgress(activeChild.child_id, gameId as string, currentLevel, score, false, sessionErrors);
    }
    router.back();
  };

  if (gameOver) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {win && score === 100 ? '¡Nivel Completado!' : 
           timeExpired ? '¡Tiempo Agotado!' : 'Fin del Juego'}
        </Text>
        <Text style={styles.scoreResult}>Puntaje Final: {score}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          soundManager.playSound('click');
          soundManager.startBackgroundMusic();
          router.replace({
            pathname: "/math_game_session",
            params: { gameId, level: currentLevel, gameTitle }
          });
        }}>
          <Text style={styles.backButtonText}>Reiniciar Nivel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          soundManager.playSound('click');
          soundManager.restartBackgroundMusic();
          router.replace('/(tabs)');
        }}>
          <Text style={styles.backButtonText}>Volver al Menú</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={handleExit}
          >
            <IconSymbol name="chevron.left" size={32} color="#4158D0" />
          </TouchableOpacity>
        </View>
        <Text style={styles.gameTitle}>{gameTitle} - Nivel {level}</Text>
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PUNTOS</Text>
            <Text style={styles.statValueText}>{score}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TIEMPO</Text>
            <Text style={[styles.statValueText, timeLeft < 30 && { color: '#ff3b30' }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>VIDAS</Text>
            <Text style={styles.statValueText}>{'❤️'.repeat(lives)}</Text>
          </View>
        </View>
        <Text style={styles.progressText}>Pregunta {Math.min(questionCount + 1, TOTAL_QUESTIONS)} de {TOTAL_QUESTIONS}</Text>
      </View>

      <View style={styles.questionBox}>
        <Text style={styles.questionText}>
          {question.operation === '' 
            ? question.num1 
            : `${question.num1} ${question.operation} ${question.num2}`} = ?
        </Text>
      </View>

      {gameId?.includes('porcentajes') && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{PERCENTAGE_HINTS[currentLevel]}</Text>
        </View>
      )}

      {gameId?.includes('proporciones') && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{PROPORTION_HINTS[currentLevel]}</Text>
        </View>
      )}

      {gameId?.includes('probabilidad') && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{PROBABILITY_HINTS[currentLevel]}</Text>
        </View>
      )}

      {gameId?.includes('negativos') && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{NEGATIVE_HINTS[currentLevel]}</Text>
        </View>
      )}

      {gameId?.includes('potencias') && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{POWER_HINTS[currentLevel]}</Text>
        </View>
      )}

      {gameId?.includes('plano') ? (
        <View style={styles.planeContainer}>
          {(() => {
            const range = currentLevel === 1 ? 5 : currentLevel === 2 ? 10 : 15;
            const stepSize = range === 5 ? 1 : range === 10 ? 2 : 5;
            const step = PLANE_SIZE / (range * 2);
            const labels = [];
            for (let i = -range; i <= range; i += stepSize) {
              if (i === 0) continue;
              labels.push(i);
            }

            return (
              <View style={[styles.grid, { width: PLANE_SIZE, height: PLANE_SIZE }]}>
                {/* Ejes */}
                <View style={styles.axisX} />
                <View style={styles.axisY} />
                
                {/* Números en los ejes */}
                {labels.map(val => (
                  <React.Fragment key={`labels-${val}`}>
                    {/* Eje X */}
                    <Text style={[
                      styles.axisNumber, 
                      { 
                        left: (PLANE_SIZE / 2) + (val * step) - 10, 
                        top: (PLANE_SIZE / 2) + 5 
                      }
                    ]}>
                      {val}
                    </Text>
                    {/* Eje Y */}
                    <Text style={[
                      styles.axisNumber, 
                      { 
                        top: (PLANE_SIZE / 2) - (val * step) - 10, 
                        left: (PLANE_SIZE / 2) - 20,
                        textAlign: 'right',
                        width: 15
                      }
                    ]}>
                      {val}
                    </Text>
                  </React.Fragment>
                ))}

                {/* Etiquetas de los ejes */}
                <Text style={styles.axisLabelX}>X</Text>
                <Text style={styles.axisLabelY}>Y</Text>

                {/* Punto interactivo */}
                <Animated.View
                  {...panResponder.panHandlers}
                  style={[
                    styles.point,
                    {
                      transform: [
                        { translateX: pan.x },
                        { translateY: pan.y }
                      ]
                    }
                  ]}
                >
                  <View style={styles.pointInner} />
                </Animated.View>
              </View>
            );
          })()}

          <TouchableOpacity 
            style={[styles.checkButton, processing && { opacity: 0.7 }]} 
            onPress={() => {
              soundManager.playSound('click');
              handleCheckPlano();
            }}
            disabled={processing}
          >
            <Text style={styles.checkButtonText}>COMPROBAR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.optionsGrid}>
          {options.map((opt, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.optionButton, processing && { opacity: 0.7 }]} 
              onPress={() => {
                soundManager.playSound('click');
                handleAnswer(opt);
              }}
              disabled={processing}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    width: '100%',
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  headerButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 5,
  },
  navButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 15,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 2,
  },
  statValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressText: {
    marginTop: 15,
    color: '#999',
    fontWeight: '600',
  },
  questionBox: {
    backgroundColor: '#f0f4ff',
    padding: 40,
    borderRadius: 25,
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4158D0',
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'center',
  },
  optionButton: {
    backgroundColor: '#fff',
    width: '45%',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreResult: {
    fontSize: 24,
    marginBottom: 30,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#4158D0',
    padding: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  planeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  grid: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  axisX: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#333',
  },
  axisY: {
    position: 'absolute',
    height: '100%',
    width: 2,
    backgroundColor: '#333',
  },
  axisLabelX: {
    position: 'absolute',
    right: -15,
    fontWeight: 'bold',
  },
  axisLabelY: {
    position: 'absolute',
    top: -20,
    fontWeight: 'bold',
  },
  axisNumber: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
  },
  point: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(65, 88, 208, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pointInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4158D0',
  },
  checkButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  coordDisplay: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  hintBox: {
    backgroundColor: '#fff9c4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fbc02d',
    borderStyle: 'dashed',
  },
  hintText: {
    fontSize: 14,
    color: '#5d4037',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
