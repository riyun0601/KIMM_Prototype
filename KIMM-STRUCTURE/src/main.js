import { mountEvaluationExit } from '../../evaluation.js';
import './app/styles.css';
import { createStructureShell } from './app/structure-shell.js';
document.querySelector('#app').append(createStructureShell());

mountEvaluationExit('structure');
