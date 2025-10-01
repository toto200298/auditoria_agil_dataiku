# Herramienta de Auditoría Ágil en Dataiku

## ¿Por qué usar este diagnóstico en Dataiku?
Este formulario interactivo permite **auditar y optimizar proyectos en Dataiku** de manera ágil y estructurada.  
A partir de *checks* guiados, genera un **score global**, verifica mínimos críticos (*gates*) y calcula métricas clave como cobertura, cumplimiento high, eficiencia técnica y riesgo operativo.  

Además, produce un **plan de acción priorizado**, exportable en **CSV o PDF**, para decisiones rápidas y mejor gobernanza.

<p align="center">
  <img src="auditoria agil.png" alt="Auditoría Ágil en Dataiku" width="600"/>
</p>


## Objetivo
Evaluar con mínima fricción el estado de un proyecto en Dataiku.  

El diagnóstico entrega:  
- Un **score global** de madurez.  
- Verificación de **mínimos críticos (gates)**.  
- Un **plan de acción priorizado** por severidad.  

En la mayoría de las organizaciones, los proyectos de analítica y machine learning se construyen rápido, pero rara vez se auditan con la misma velocidad. Esto abre la puerta a riesgos ocultos:  
- Sobrecostos en cómputo.  
- Problemas de escalabilidad.  
- Fallas de gobernanza en producción.  

El **Formulario de Optimización en Dataiku** enfrenta este desafío y en menos de una hora entrega resultados claros.


## Qué obtienes con este diagnóstico

- **KPIs de madurez técnica y operativa**  
  - Eficiencia de motores.  
  - Gobernanza de proyectos.  
  - Cobertura de críticos.  
  - Balance entre categorías.  
  - Índice de riesgo operativo (IRO).  

- **Plan de acción inmediato y priorizado**  
  - Incluye las 5 acciones más urgentes.  
  - Con severidad, plazos sugeridos y responsabilidades (RACI).  

- **Reporte descargable (PDF/CSV)**  
  - Evidencia para auditorías internas.  
  - Presentación a comités de TI.  
  - Insumo en negociaciones con proveedores.  

## Métricas clave

- **Cobertura**: % de ítems evaluados.  
- **Cumplimiento High**: % de ítems de severidad alta cumplidos.  
- **Gates (mínimos críticos)**: requisitos por áreas clave.  
- **Índice de Riesgo Operativo (IRO)**: 0–100; menor es mejor.  
- **Brecha vs Benchmark**: diferencia media vs umbral objetivo.  
- **Eficiencia técnica (SEF)**: motores, pipelines y particiones.  
- **Gobernanza operativa (MGO)**: documentación, legibilidad y variables.  
- **Coherencia Perf↔Motores**: alineación rendimiento–motor.  
- **Balance entre categorías**: equilibrio del avance (1 − CV).  
- **Cobertura de críticos**: % de checks críticos cumplidos.  

## Valor para la práctica
- Permite **decisiones go/no-go en minutos**.  
- Prioriza lo crítico para reducir riesgos.  
- Fomenta **pushdown** y **particionado** para eficiencia.  
- Consolida la gobernanza y asegura continuidad operativa.  

## Sugerencia de uso
Utiliza el plan generado como **checklist de sprint**:  
- Marca avances conforme se implementan mejoras.  
- Regenera el diagnóstico para visualizar el impacto en **KPIs** e **IRO**.

## Cómo usar esta herramienta

1. **Descarga** todos los archivos del repositorio en una misma carpeta local.  
2. Abre el archivo **`formulario_index.html`** con tu navegador favorito (doble clic o clic derecho → abrir con navegador).  
3. No necesitas servidor ni instalación extra, todo corre en **modo local**.  
4. Completa el formulario, genera el diagnóstico y exporta los resultados en **CSV o PDF**.  


