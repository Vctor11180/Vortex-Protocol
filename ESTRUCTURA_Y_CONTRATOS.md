# 🏗️ Arquitectura de Vortex: Estructura y Representación On-chain

Este documento explica el "porqué" de cada carpeta en el repositorio y la representación filosófica y técnica de cada Smart Contract.

---

## 📂 El Mapa del Repositorio (Estructura)

Vortex utiliza un modelo de **Monorepo Moderno**, integrando tanto el frontend como el desarrollo on-chain en un solo lugar para asegurar la coherencia del protocolo.

### 1. `defi-hub/` (El Corazón del Proyecto)
Es el contenedor principal. Separamos el **Frontend** (interfaz de usuario) de los **Contracts** (lógica on-chain) para permitir flujos de trabajo paralelos.
- **`defi-hub/frontend/`**: Construido con Next.js y Tailwind CSS. Representa la cara del "Ajolote Sabio".
- **`defi-hub/contracts/`**: Un proyecto completo de **Foundry**. Elegimos Foundry por ser el framework de desarrollo de Smart Contracts más rápido y eficiente de la industria (basado en Rust).

### 2. `lib/` y `defi-hub/contracts/lib/` (Las Herramientas)
Aquí residen las dependencias. En lugar de instalar paquetes vía `npm`, usamos **Git Submodules** para traer bibliotecas inmutables directamente desde su código fuente (como **OpenZeppelin** para seguridad y **Forge-std** para testing). Esto garantiza que el código de terceros nunca cambie sin nuestra aprobación.

### 3. `script/` (El Equipo de Despliegue)
Aquí guardamos los scripts de automatización. No desplegamos contratos manualmente. Usamos scripts de **Solidity/Foundry** que orquestan las transacciones, registran los hooks y verifican las direcciones en el explorador de bloques (como Etherscan). Es nuestro "DevOps" en la blockchain.

### 4. `src/` (La Fábrica)
Contiene el código fuente de los Smart Contracts. Cada archivo tiene una única responsabilidad (Principio de Responsabilidad Única).

---

## 💎 Los Pilares de Vortex (¿Qué representan los contratos?)

Cada contrato en Vortex tiene una personalidad y un rol específico:

### ⚙️ `AMM.sol` (El Motor de Intercambio)
*   **¿Qué representa?**: El banco central del protocolo.
*   **Función**: Gestiona los pools de liquidez y ejecuta la matemática de producto constante ($x \cdot y = k$). Es el ejecutor de confianza que garantiza que el intercambio de activos sea matemáticamente correcto.

### 🧠 `HookRegistry.sol` (El Director de Orquesta)
*   **¿Qué representa?**: El cerebro adaptable de Vortex.
*   **Función**: Permite que el protocolo sea **Extensible**. Sin este contrato, Vortex sería un fork estático de Uniswap. El Registro permite que podamos añadir nuevas reglas (hooks) sin mover el dinero de los usuarios de los pools, permitiendo una "evolución sin migración".

### 🏅 `PointsHook.sol` (El Motor de Lealtad)
*   **¿Qué representa?**: La identidad y el mérito del usuario.
*   **Función**: Utiliza el estándar **ERC-1155**. No es solo un contador de puntos; es un sistema de reputación on-chain. Representa el puente entre el trading técnico y la gamificación social. Al ser ERC-1155, representa eficiencia (gas ahorrado) y versatilidad (puntos + insignias).

### ⚖️ `DynamicFeeHook.sol` (El Estabilizador de Mercado)
*   **¿Qué representa?**: La inteligencia financiera del protocolo.
*   **Función**: Protege a los Proveedores de Liquidez (LPs). Representa un mecanismo de defensa contra el arbitraje predatorio. Cuando el mercado se vuelve caótico (alta volatilidad), este contrato ajusta las comisiones para compensar el riesgo, asegurando que Vortex sea siempre un lugar seguro para depositar capital.

---

## ❓ Preguntas de Estructura para los Jueces

**P: ¿Por qué hay una carpeta `lib` y no usamos node_packages?**
**R:** Por **Determinismo y Seguridad**. En Smart Contracts, queremos saber exactamente qué código estamos ejecutando. Submódulos de Git nos permiten fijar versiones específicas sin depender de repositorios de paquetes que podrían ser comprometidos.

**P: ¿Por qué elegiste Foundry sobre Hardhat?**
**R:** Por la **Velocidad de Iteración**. Foundry permite escribir tests en Solidity, lo que significa que el equipo de desarrollo no tiene que cambiar de lenguaje (de Solidity a JavaScript) al testear, mejorando la coherencia y detectando errores de lógica on-chain más rápido.

**P: ¿En qué se diferencia `src` de `script`?**
**R:** `src` es lo que **vive** permanentemente en la blockchain. `script` es el andamiaje que usamos para **llevarlo** allí. Es la diferencia entre los planos de un motor y las herramientas de fábrica usadas para ensamblarlo.
