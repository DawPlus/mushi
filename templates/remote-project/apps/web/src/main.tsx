import { createRoot } from "react-dom/client"
import Feature from "./Feature"
const root = document.getElementById("root")
if (!root) throw new Error("Missing root")
createRoot(root).render(<Feature />)
