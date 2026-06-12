// app/game.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { saveHighScore } from "../utils/score";

export default function GameScreen() {
  const router = useRouter();

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [successes, setSuccesses] = useState(0);
  const [errors, setErrors] = useState(0);
  const [question, setQuestion] = useState({ num1: 0, num2: 0, operation: '+', answer: 0 });
  const [options, setOptions] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [level, setLevel] = useState(1);
  const [startTime] = useState(Date.now());
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Generate a new math question based on current level
  const generateQuestion = () => {
    let num1, num2, answer, operation;
    const operations = ['+', '-', '×'];
    
    // Adjust difficulty based on level
    const maxNum = Math.min(10 + level * 2, 50);
    
    // Choose operation based on level
    if (level < 3) {
      operation = '+';
    } else if (level < 5) {
      operation = operations[Math.floor(Math.random() * 2)]; // + or -
    } else {
      operation = operations[Math.floor(Math.random() * 3)]; // +, - or ×
    }
    
    // Generate numbers based on operation
    if (operation === '+') {
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      answer = num1 + num2;
    } else if (operation === '-') {
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * num1);
      answer = num1 - num2;
    } else { // multiplication
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
    }
    
    setQuestion({ num1, num2, operation, answer });
    
    // Generate answer options (1 correct, 3 wrong)
    const wrongAnswers: number[] = [];
    while (wrongAnswers.length < 3) {
      let wrongAnswer;
      if (operation === '+') {
        wrongAnswer = answer + Math.floor(Math.random() * 10) - 5;
      } else if (operation === '-') {
        wrongAnswer = answer + Math.floor(Math.random() * 10) - 5;
      } else {
        wrongAnswer = answer + Math.floor(Math.random() * 10) - 5;
      }
      
      // Ensure wrong answer is not the same as correct answer and not already in the list
      if (wrongAnswer !== answer && !wrongAnswers.includes(wrongAnswer) && wrongAnswer >= 0) {
        wrongAnswers.push(wrongAnswer);
      }
    }
    
    // Combine correct and wrong answers, then shuffle
    const allOptions = [answer, ...wrongAnswers];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    
    setOptions(allOptions);
    setAnswered(false);
    setSelectedAnswer(null);
  };

  // Handle answer selection
  const handleAnswer = (selectedOption: number) => {
    if (answered) return;
    
    setSelectedAnswer(selectedOption);
    setAnswered(true);
    
    const correct = selectedOption === question.answer;
    setIsCorrect(correct);
    
    if (correct) {
      // Increase score based on level
      const pointsEarned = 10 * level;
      setScore(score + pointsEarned);
      setSuccesses(s => s + 1);
      
      // Level up every 5 correct answers
      if ((score + pointsEarned) >= level * 50) {
        setLevel(level + 1);
      }
      
      // Animate success
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Generate new question after a short delay
      setTimeout(() => {
        generateQuestion();
      }, 1000);
    } else {
      setErrors(e => e + 1);
      if (lives > 1) {
        setLives(lives - 1);
        
        // Generate new question after a short delay
        setTimeout(() => {
          generateQuestion();
        }, 1000);
      } else {
        // Game over
        const playtime = Math.floor((Date.now() - startTime) / 1000);
        saveHighScore(score, 'Matemáticas', level, playtime, successes, errors + 1);
        
        // Return to home screen after a delay
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    }
  };

  // Initialize game
  useEffect(() => {
    generateQuestion();
  }, []);

  // Get operation symbol
  const getOperationSymbol = (op: string) => {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '×': return '×';
      default: return '+';
    }
  };

  const handleGoBack = () => {
    const playtime = Math.floor((Date.now() - startTime) / 1000);
    saveHighScore(score, 'Matemáticas', level, playtime, successes, errors);
    router.push("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>NIVEL</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PUNTOS</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>VIDAS</Text>
            <Text style={styles.statValue}>{'❤️'.repeat(lives)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.gameContainer}>
        <Text style={styles.gameTitle}>Resuelve la operación</Text>
        
        <Animated.View 
          style={[
            styles.questionContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Text style={styles.questionText}>
            {question.num1} {getOperationSymbol(question.operation)} {question.num2} = ?
          </Text>
        </Animated.View>
        
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && (
                  option === question.answer 
                    ? styles.correctOption 
                    : styles.wrongOption
                )
              ]}
              onPress={() => handleAnswer(option)}
              disabled={answered}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {answered && (
          <View style={styles.feedbackContainer}>
            <Text style={[
              styles.feedbackText,
              isCorrect ? styles.correctFeedback : styles.wrongFeedback
            ]}>
              {isCorrect ? '¡Correcto! 🎉' : '¡Incorrecto! 😢'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4158D0',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  questionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  questionText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: width * 0.9,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: width * 0.43,
    height: 80,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  correctOption: {
    backgroundColor: 'rgba(46, 204, 113, 0.7)',
    borderColor: '#2ecc71',
  },
  wrongOption: {
    backgroundColor: 'rgba(231, 76, 60, 0.7)',
    borderColor: '#e74c3c',
  },
  feedbackContainer: {
    marginTop: 20,
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctFeedback: {
    color: '#2ecc71',
  },
  wrongFeedback: {
    color: '#e74c3c',
  },
});
