import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './screens/Welcome'
import OnboardChild from './screens/OnboardChild'
import OnboardGoal from './screens/OnboardGoal'
import AuditIntro from './screens/AuditIntro'
import KidTest from './screens/KidTest'
import KidComplete from './screens/KidComplete'
import Diagnosis from './screens/Diagnosis'
import Home from './screens/Home'
import FixPlan from './screens/FixPlan'
import Milestone from './screens/Milestone'
import TermAudit from './screens/TermAudit'
import Tracker from './screens/Tracker'
import Accuracy from './screens/Accuracy'
import Upgrade from './screens/Upgrade'
import You from './screens/You'
import DevLlm from './screens/DevLlm'

export default function App() {
  return (
    <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/onboarding/child" element={<OnboardChild />} />
        <Route path="/onboarding/goal" element={<OnboardGoal />} />
        <Route path="/audit/intro" element={<AuditIntro />} />
        <Route path="/audit/test" element={<KidTest />} />
        <Route path="/audit/complete" element={<KidComplete />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/home" element={<Home />} />
        <Route path="/fix" element={<FixPlan />} />
        <Route path="/milestone" element={<Milestone />} />
        <Route path="/term-audit" element={<TermAudit />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/accuracy" element={<Accuracy />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/you" element={<You />} />
        <Route path="/dev/llm" element={<DevLlm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
