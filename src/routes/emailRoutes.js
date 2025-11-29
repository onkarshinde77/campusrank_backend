import express from 'express'
import { sendPasswordResetEmail } from '../utils/email.js';

const emailRouter=express.Router();

emailRouter.post('/email',sendPasswordResetEmail);

export default emailRouter;
