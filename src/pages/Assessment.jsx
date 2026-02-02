import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function Assessment() {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
    const [attemptId, setAttemptId] = useState(null);
    const [timeTaken, setTimeTaken] = useState({}); // { questionId: seconds }
    const [startTime, setStartTime] = useState(Date.now());

    // Proctoring
    const [violationCount, setViolationCount] = useState(0);
    const [proctoringLog, setProctoringLog] = useState([]);
    const documentRef = useRef(document);

    useEffect(() => {
        startAssessment();

        // Enforce Fullscreen
        const enterFullscreen = async () => {
            try {
                if (documentRef.current.documentElement.requestFullscreen) {
                    await documentRef.current.documentElement.requestFullscreen();
                }
            } catch (e) {
                console.warn("Fullscreen request denied", e);
            }
        };
        enterFullscreen();

        // Proctoring Event Listeners
        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation("Tab switched or minimized");
            }
        };

        const handleBlur = () => {
            // Optional: Some browsers fire blur when alert opens, be careful.
            // For strict mode:
            logViolation("Window lost focus");
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                logViolation("Exited Fullscreen");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };
    }, []);

    const logViolation = (type) => {
        const timestamp = new Date().toISOString();
        console.warn(`Proctoring Violation: ${type} at ${timestamp}`);
        setViolationCount(prev => prev + 1);
        setProctoringLog(prev => [...prev, { type, timestamp }]);
        alert(`Warning: ${type}! This has been recorded.`);
    };

    const startAssessment = async () => {
        try {
            const skillsToAssess = location.state?.skills || [];
            // If no specific skills passed, backend falls back to profile skills
            const payload = skillsToAssess.length > 0 ? { skills: skillsToAssess } : {};

            const response = await API.post('/api/assessments/start/', payload);
            setAttemptId(response.data.attempt_id);
            setQuestions(response.data.questions);
            setLoading(false);
            setStartTime(Date.now());
        } catch (err) {
            console.error("Failed to start assessment", err);
            setError(err.response?.data?.error || "Failed to load assessment. Please ensure you have added skills.");
            setLoading(false);
        }
    };

    const handleAnswer = (optionIndex) => {
        const currentQ = questions[currentQuestionIndex];
        setAnswers({ ...answers, [currentQ.id]: optionIndex });
    };

    const handleNext = () => {
        // Record time for current question
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const currentQ = questions[currentQuestionIndex];

        setTimeTaken(prev => ({
            ...prev,
            [currentQ.id]: (prev[currentQ.id] || 0) + elapsed
        }));
        setStartTime(now); // Reset timer for next question

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            submitAssessment();
        }
    };

    const submitAssessment = async () => {
        setLoading(true);
        try {
            // Calculate final time chunk for last question
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const currentQ = questions[currentQuestionIndex];
            const finalTimeTaken = {
                ...timeTaken,
                [currentQ.id]: (timeTaken[currentQ.id] || 0) + elapsed
            };

            const payload = {
                attempt_id: attemptId,
                answers: answers,
                time_taken: finalTimeTaken,
                proctoring_log: proctoringLog
            };

            const response = await API.post('/api/assessments/submit/', payload);
            alert(`Assessment ${response.data.status}!\nScore: ${(response.data.score * 100).toFixed(1)}%\nVSPS: ${response.data.vsps.toFixed(2)}`);
            navigate('/student/dashboard');
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to submit assessment.");
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Assessment...</div>;
    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h2 className="text-xl text-red-600 font-bold mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <button onClick={() => navigate('/student')} className="bg-indigo-600 text-white px-4 py-2 rounded">Back to Dashboard</button>
        </div>
    );

    if (questions.length === 0) return <div>No questions found.</div>;

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <h1 className="text-xl font-bold">Skill Assessment</h1>
                    <span className="text-sm bg-indigo-700 px-3 py-1 rounded-full">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>

                <div className="p-8">
                    <div className="mb-6">
                        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                            {currentQuestion.skill_name || 'Skill Question'}
                        </span>
                        <h2 className="mt-2 text-xl font-medium text-slate-900">
                            {currentQuestion.text}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion.id] === idx
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 hover:border-indigo-300'
                                    }`}
                            >
                                <div className="flex items-center">
                                    <span className={`flex-shrink-0 h-6 w-6 rounded-full border flex items-center justify-center mr-3 ${answers[currentQuestion.id] === idx ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                                        }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    {option}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-between items-center border-t pt-6">
                        <div className="text-sm text-slate-500">
                            violations: <span className="text-red-500 font-bold">{violationCount}</span>
                        </div>
                        <button
                            onClick={handleNext}
                            disabled={answers[currentQuestion.id] === undefined}
                            className={`px-6 py-2 rounded-md font-bold text-white transition-colors ${answers[currentQuestion.id] === undefined
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
