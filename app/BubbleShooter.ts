type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'pink' | 'rainbow' | 'bomb' | 'freeze'

interface Bubble {
  x: number
  y: number
  color: BubbleColor
  row: number
  col: number
  radius: number
  isPopping?: boolean
  popProgress?: number
}

interface ShootingBubble {
  x: number
  y: number
  vx: number
  vy: number
  color: BubbleColor
  radius: number
}

interface LevelConfig {
  colors: number
  speed: number
  patterns: string[][]
  hasPowerUps: boolean
  hasObstacles: boolean
  timeLimit?: number
  rowSpeed?: number
}

export default class BubbleShooter {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private running: boolean = false
  private animationId: number | null = null

  // Game state
  private level: number = 1
  private score: number = 0
  private lives: number = 3
  private combo: number = 0
  private maxCombo: number = 0

  // Bubble grid
  private bubbles: (Bubble | null)[][] = []
  private readonly BUBBLE_RADIUS = 20
  private readonly ROWS = 10
  private readonly COLS = 15
  private readonly BUBBLE_SPACING = 42

  // Shooter
  private shooterX: number
  private shooterY: number
  private currentBubble: BubbleColor | null = null
  private nextBubble: BubbleColor | null = null
  private shootingBubble: ShootingBubble | null = null
  private aimAngle: number = -Math.PI / 2

  // Mouse/Touch
  private mouseX: number = 0
  private mouseY: number = 0

  // Level configs
  private readonly LEVELS: LevelConfig[] = [
    { colors: 3, speed: 1, patterns: [], hasPowerUps: false, hasObstacles: false },
    { colors: 4, speed: 1.1, patterns: [], hasPowerUps: false, hasObstacles: false },
    { colors: 4, speed: 1.2, patterns: [], hasPowerUps: false, hasObstacles: false },
    { colors: 5, speed: 1.3, patterns: [], hasPowerUps: false, hasObstacles: false },
    { colors: 5, speed: 1.4, patterns: [], hasPowerUps: false, hasObstacles: false, rowSpeed: 0.05 },
    { colors: 5, speed: 1.5, patterns: [], hasPowerUps: true, hasObstacles: false, rowSpeed: 0.08 },
    { colors: 6, speed: 1.6, patterns: [], hasPowerUps: true, hasObstacles: false, rowSpeed: 0.1 },
    { colors: 6, speed: 1.7, patterns: [], hasPowerUps: true, hasObstacles: false, rowSpeed: 0.12 },
    { colors: 6, speed: 1.8, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.15 },
    { colors: 6, speed: 1.9, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.18 },
    { colors: 7, speed: 2, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.2 },
    { colors: 7, speed: 2.1, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.22 },
    { colors: 7, speed: 2.2, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.25 },
    { colors: 7, speed: 2.3, patterns: [], hasPowerUps: true, hasObstacles: true, timeLimit: 180, rowSpeed: 0.28 },
    { colors: 8, speed: 2.4, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.3 },
    { colors: 8, speed: 2.5, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.32 },
    { colors: 8, speed: 2.6, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.35 },
    { colors: 8, speed: 2.7, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.38 },
    { colors: 8, speed: 2.8, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.4 },
    { colors: 8, speed: 3, patterns: [], hasPowerUps: true, hasObstacles: true, rowSpeed: 0.5 }
  ]

  private readonly COLOR_MAP: { [key: string]: string } = {
    red: '#FF4757',
    blue: '#5352ED',
    green: '#2ED573',
    yellow: '#FFA502',
    purple: '#A55EEA',
    orange: '#FF6348',
    cyan: '#00D2D3',
    pink: '#FF6B9D',
    rainbow: '#FFFFFF',
    bomb: '#2F3542',
    freeze: '#70A1FF'
  }

  private gameState: 'playing' | 'won' | 'lost' | 'menu' = 'menu'
  private rowOffset: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx
    this.width = canvas.width
    this.height = canvas.height

    this.shooterX = this.width / 2
    this.shooterY = this.height - 60

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.canvas.addEventListener('click', this.handleClick.bind(this))
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this))
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this))
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseX = (e.clientX - rect.left) * (this.width / rect.width)
    this.mouseY = (e.clientY - rect.top) * (this.height / rect.height)
    this.updateAimAngle()
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 0) return
    const rect = this.canvas.getBoundingClientRect()
    this.mouseX = (e.touches[0].clientX - rect.left) * (this.width / rect.width)
    this.mouseY = (e.touches[0].clientY - rect.top) * (this.height / rect.height)
    this.updateAimAngle()
  }

  private handleClick(e: MouseEvent) {
    if (this.gameState === 'menu') {
      this.startLevel(1)
      return
    }
    if (this.gameState === 'won' || this.gameState === 'lost') {
      this.gameState = 'menu'
      this.level = 1
      this.score = 0
      this.lives = 3
      return
    }
    this.shoot()
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault()
    if (this.gameState === 'menu') {
      this.startLevel(1)
      return
    }
    if (this.gameState === 'won' || this.gameState === 'lost') {
      this.gameState = 'menu'
      this.level = 1
      this.score = 0
      this.lives = 3
      return
    }
    this.shoot()
  }

  private updateAimAngle() {
    const dx = this.mouseX - this.shooterX
    const dy = this.mouseY - this.shooterY
    if (dy < 0) {
      this.aimAngle = Math.atan2(dy, dx)
      // Clamp angle
      const minAngle = -Math.PI + 0.3
      const maxAngle = -0.3
      if (this.aimAngle < minAngle) this.aimAngle = minAngle
      if (this.aimAngle > maxAngle) this.aimAngle = maxAngle
    }
  }

  private shoot() {
    if (this.shootingBubble || !this.currentBubble || this.gameState !== 'playing') return

    const speed = 12
    this.shootingBubble = {
      x: this.shooterX,
      y: this.shooterY - 30,
      vx: Math.cos(this.aimAngle) * speed,
      vy: Math.sin(this.aimAngle) * speed,
      color: this.currentBubble,
      radius: this.BUBBLE_RADIUS
    }

    this.currentBubble = this.nextBubble
    this.nextBubble = this.getRandomColor()
  }

  private getRandomColor(): BubbleColor {
    const config = this.LEVELS[this.level - 1]
    const colors: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink']
    const availableColors = colors.slice(0, config.colors)

    // Occasionally add power-ups
    if (config.hasPowerUps && Math.random() < 0.1) {
      const powerUps: BubbleColor[] = ['rainbow', 'bomb', 'freeze']
      return powerUps[Math.floor(Math.random() * powerUps.length)]
    }

    return availableColors[Math.floor(Math.random() * availableColors.length)]
  }

  private initBubbles() {
    this.bubbles = []
    const config = this.LEVELS[this.level - 1]

    for (let row = 0; row < 5; row++) {
      this.bubbles[row] = []
      const cols = row % 2 === 0 ? this.COLS : this.COLS - 1
      for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.8) {
          this.bubbles[row][col] = {
            x: this.getBubbleX(row, col),
            y: this.getBubbleY(row),
            color: this.getRandomColor(),
            row,
            col,
            radius: this.BUBBLE_RADIUS
          }
        } else {
          this.bubbles[row][col] = null
        }
      }
    }

    for (let row = 5; row < this.ROWS; row++) {
      this.bubbles[row] = []
    }
  }

  private getBubbleX(row: number, col: number): number {
    const offset = row % 2 === 0 ? 0 : this.BUBBLE_SPACING / 2
    return offset + col * this.BUBBLE_SPACING + this.BUBBLE_SPACING
  }

  private getBubbleY(row: number): number {
    return row * this.BUBBLE_SPACING * 0.87 + this.BUBBLE_SPACING + this.rowOffset
  }

  private startLevel(level: number) {
    this.level = level
    this.gameState = 'playing'
    this.initBubbles()
    this.currentBubble = this.getRandomColor()
    this.nextBubble = this.getRandomColor()
    this.combo = 0
    this.rowOffset = 0
  }

  start() {
    this.running = true
    this.gameLoop()
  }

  stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  private gameLoop = () => {
    if (!this.running) return

    this.update()
    this.render()

    this.animationId = requestAnimationFrame(this.gameLoop)
  }

  private update() {
    if (this.gameState !== 'playing') return

    // Update shooting bubble
    if (this.shootingBubble) {
      this.shootingBubble.x += this.shootingBubble.vx
      this.shootingBubble.y += this.shootingBubble.vy

      // Wall collision
      if (this.shootingBubble.x - this.BUBBLE_RADIUS < 0) {
        this.shootingBubble.x = this.BUBBLE_RADIUS
        this.shootingBubble.vx *= -1
      }
      if (this.shootingBubble.x + this.BUBBLE_RADIUS > this.width) {
        this.shootingBubble.x = this.width - this.BUBBLE_RADIUS
        this.shootingBubble.vx *= -1
      }

      // Check collision with grid bubbles
      const collision = this.checkBubbleCollision(this.shootingBubble)
      if (collision || this.shootingBubble.y - this.BUBBLE_RADIUS < 0) {
        this.addBubbleToGrid(this.shootingBubble)
        this.shootingBubble = null
      }
    }

    // Update popping animations
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble?.isPopping) {
          bubble.popProgress = (bubble.popProgress || 0) + 0.1
          if (bubble.popProgress >= 1) {
            this.bubbles[row][col] = null
          }
        }
      }
    }

    // Update row offset for moving rows
    const config = this.LEVELS[this.level - 1]
    if (config.rowSpeed) {
      this.rowOffset += config.rowSpeed
      this.updateBubblePositions()

      // Check if bubbles reached bottom
      if (this.checkGameOver()) {
        this.lives--
        if (this.lives <= 0) {
          this.gameState = 'lost'
        } else {
          this.rowOffset = 0
          this.updateBubblePositions()
        }
      }
    }

    // Check win condition
    if (this.checkLevelComplete()) {
      if (this.level >= 20) {
        this.gameState = 'won'
      } else {
        this.level++
        this.startLevel(this.level)
      }
    }
  }

  private updateBubblePositions() {
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble) {
          bubble.y = this.getBubbleY(row)
        }
      }
    }
  }

  private checkGameOver(): boolean {
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble && bubble.y + this.BUBBLE_RADIUS > this.shooterY - 50) {
          return true
        }
      }
    }
    return false
  }

  private checkLevelComplete(): boolean {
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        if (this.bubbles[row][col]) return false
      }
    }
    return true
  }

  private checkBubbleCollision(shooting: ShootingBubble): boolean {
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble && !bubble.isPopping) {
          const dx = shooting.x - bubble.x
          const dy = shooting.y - bubble.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < this.BUBBLE_RADIUS * 2) {
            return true
          }
        }
      }
    }
    return false
  }

  private addBubbleToGrid(shooting: ShootingBubble) {
    // Find closest grid position
    let closestRow = Math.round((shooting.y - this.BUBBLE_SPACING - this.rowOffset) / (this.BUBBLE_SPACING * 0.87))
    closestRow = Math.max(0, Math.min(this.ROWS - 1, closestRow))

    const offset = closestRow % 2 === 0 ? 0 : this.BUBBLE_SPACING / 2
    let closestCol = Math.round((shooting.x - offset - this.BUBBLE_SPACING) / this.BUBBLE_SPACING)
    const maxCols = closestRow % 2 === 0 ? this.COLS : this.COLS - 1
    closestCol = Math.max(0, Math.min(maxCols - 1, closestCol))

    // Ensure row array exists
    if (!this.bubbles[closestRow]) {
      this.bubbles[closestRow] = []
    }

    // Handle power-ups
    if (shooting.color === 'bomb') {
      this.explodeBomb(closestRow, closestCol)
      return
    }

    // Place bubble
    this.bubbles[closestRow][closestCol] = {
      x: this.getBubbleX(closestRow, closestCol),
      y: this.getBubbleY(closestRow),
      color: shooting.color,
      row: closestRow,
      col: closestCol,
      radius: this.BUBBLE_RADIUS
    }

    // Check for matches
    const matches = this.findMatches(closestRow, closestCol)
    if (matches.length >= 3) {
      this.popBubbles(matches)
      this.dropFloatingBubbles()
      this.combo++
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      this.score += matches.length * 10 * this.combo
    } else {
      this.combo = 0
    }
  }

  private explodeBomb(row: number, col: number) {
    const radius = 2
    const toExplode: Bubble[] = []

    for (let r = Math.max(0, row - radius); r <= Math.min(this.bubbles.length - 1, row + radius); r++) {
      for (let c = 0; c < this.bubbles[r].length; c++) {
        const bubble = this.bubbles[r][c]
        if (bubble) {
          const dr = r - row
          const dc = c - col
          if (Math.sqrt(dr * dr + dc * dc) <= radius) {
            toExplode.push(bubble)
          }
        }
      }
    }

    this.popBubbles(toExplode)
    this.dropFloatingBubbles()
    this.score += toExplode.length * 20
  }

  private findMatches(row: number, col: number): Bubble[] {
    const bubble = this.bubbles[row]?.[col]
    if (!bubble) return []
    const specialColors: BubbleColor[] = ['rainbow', 'bomb', 'freeze']
    if (specialColors.includes(bubble.color)) return []

    const matches: Bubble[] = []
    const visited = new Set<string>()
    const queue: [number, number][] = [[row, col]]

    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      const key = `${r},${c}`
      if (visited.has(key)) continue
      visited.add(key)

      const current = this.bubbles[r]?.[c]
      if (!current || current.isPopping) continue

      const isRainbow = (color: BubbleColor) => color === 'rainbow'
      const colorsMatch = current.color === bubble.color || isRainbow(current.color) || isRainbow(bubble.color)
      if (!colorsMatch) continue

      matches.push(current)

      // Check neighbors
      const neighbors = this.getNeighbors(r, c)
      for (const [nr, nc] of neighbors) {
        if (!visited.has(`${nr},${nc}`)) {
          queue.push([nr, nc])
        }
      }
    }

    return matches
  }

  private getNeighbors(row: number, col: number): [number, number][] {
    const neighbors: [number, number][] = []
    const isEvenRow = row % 2 === 0

    // Above
    if (row > 0) {
      neighbors.push([row - 1, col])
      if (isEvenRow && col > 0) {
        neighbors.push([row - 1, col - 1])
      } else if (!isEvenRow) {
        neighbors.push([row - 1, col + 1])
      }
    }

    // Below
    if (row < this.bubbles.length - 1) {
      neighbors.push([row + 1, col])
      if (isEvenRow && col > 0) {
        neighbors.push([row + 1, col - 1])
      } else if (!isEvenRow) {
        neighbors.push([row + 1, col + 1])
      }
    }

    // Left and right
    if (col > 0) neighbors.push([row, col - 1])
    if (col < this.bubbles[row].length - 1) neighbors.push([row, col + 1])

    return neighbors
  }

  private popBubbles(bubbles: Bubble[]) {
    for (const bubble of bubbles) {
      bubble.isPopping = true
      bubble.popProgress = 0
    }
  }

  private dropFloatingBubbles() {
    const connected = new Set<string>()
    const queue: [number, number][] = []

    // Start from top row
    for (let col = 0; col < this.bubbles[0]?.length || 0; col++) {
      if (this.bubbles[0][col] && !this.bubbles[0][col]!.isPopping) {
        queue.push([0, col])
      }
    }

    // BFS to find connected bubbles
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      const key = `${r},${c}`
      if (connected.has(key)) continue
      connected.add(key)

      const neighbors = this.getNeighbors(r, c)
      for (const [nr, nc] of neighbors) {
        if (!connected.has(`${nr},${nc}`) && this.bubbles[nr]?.[nc] && !this.bubbles[nr][nc]!.isPopping) {
          queue.push([nr, nc])
        }
      }
    }

    // Drop unconnected bubbles
    let droppedCount = 0
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble && !bubble.isPopping && !connected.has(`${row},${col}`)) {
          bubble.isPopping = true
          bubble.popProgress = 0
          droppedCount++
        }
      }
    }

    if (droppedCount > 0) {
      this.score += droppedCount * 15 * (this.combo + 1)
    }
  }

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#2d3561'
    this.ctx.fillRect(0, 0, this.width, this.height)

    if (this.gameState === 'menu') {
      this.renderMenu()
      return
    }

    if (this.gameState === 'won' || this.gameState === 'lost') {
      this.renderGameOver()
      return
    }

    // Render grid bubbles
    for (let row = 0; row < this.bubbles.length; row++) {
      for (let col = 0; col < this.bubbles[row].length; col++) {
        const bubble = this.bubbles[row][col]
        if (bubble) {
          this.renderBubble(bubble)
        }
      }
    }

    // Render shooting bubble
    if (this.shootingBubble) {
      this.renderBubble({
        x: this.shootingBubble.x,
        y: this.shootingBubble.y,
        color: this.shootingBubble.color,
        radius: this.shootingBubble.radius,
        row: 0,
        col: 0
      })
    }

    // Render aim line
    if (!this.shootingBubble) {
      this.renderAimLine()
    }

    // Render shooter
    this.renderShooter()

    // Render UI
    this.renderUI()
  }

  private renderBubble(bubble: Bubble) {
    const scale = bubble.isPopping ? 1 - (bubble.popProgress || 0) : 1
    const alpha = bubble.isPopping ? 1 - (bubble.popProgress || 0) : 1

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(bubble.x, bubble.y)
    this.ctx.scale(scale, scale)

    // Main bubble
    const gradient = this.ctx.createRadialGradient(-5, -5, 0, 0, 0, bubble.radius)
    const color = this.COLOR_MAP[bubble.color]

    if (bubble.color === 'rainbow') {
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.3, '#ff00ff')
      gradient.addColorStop(0.6, '#00ffff')
      gradient.addColorStop(1, '#ffff00')
    } else {
      gradient.addColorStop(0, this.lightenColor(color, 40))
      gradient.addColorStop(1, color)
    }

    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2)
    this.ctx.fill()

    // Shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    this.ctx.beginPath()
    this.ctx.arc(-7, -7, 6, 0, Math.PI * 2)
    this.ctx.fill()

    // Special icons
    if (bubble.color === 'bomb') {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('💣', 0, 0)
    } else if (bubble.color === 'freeze') {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('❄', 0, 0)
    }

    this.ctx.restore()
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.min(255, ((num >> 16) & 0xff) + percent)
    const g = Math.min(255, ((num >> 8) & 0xff) + percent)
    const b = Math.min(255, (num & 0xff) + percent)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  private renderAimLine() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([5, 5])
    this.ctx.beginPath()
    this.ctx.moveTo(this.shooterX, this.shooterY - 30)
    this.ctx.lineTo(
      this.shooterX + Math.cos(this.aimAngle) * 300,
      this.shooterY - 30 + Math.sin(this.aimAngle) * 300
    )
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  private renderShooter() {
    // Base
    this.ctx.fillStyle = '#34495e'
    this.ctx.beginPath()
    this.ctx.arc(this.shooterX, this.shooterY, 35, 0, Math.PI * 2)
    this.ctx.fill()

    // Current bubble
    if (this.currentBubble) {
      this.renderBubble({
        x: this.shooterX,
        y: this.shooterY - 30,
        color: this.currentBubble,
        radius: this.BUBBLE_RADIUS,
        row: 0,
        col: 0
      })
    }

    // Next bubble preview
    if (this.nextBubble) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      this.ctx.fillRect(this.width - 80, this.height - 80, 70, 70)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '12px Arial'
      this.ctx.fillText('Next:', this.width - 75, this.height - 85)
      this.renderBubble({
        x: this.width - 45,
        y: this.height - 45,
        color: this.nextBubble,
        radius: this.BUBBLE_RADIUS * 0.8,
        row: 0,
        col: 0
      })
    }
  }

  private renderUI() {
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`Level: ${this.level}`, 20, 30)
    this.ctx.fillText(`Score: ${this.score}`, 20, 60)
    this.ctx.fillText(`Lives: ${'❤'.repeat(this.lives)}`, 20, 90)
    if (this.combo > 1) {
      this.ctx.fillStyle = '#FFD700'
      this.ctx.fillText(`Combo x${this.combo}!`, 20, 120)
    }
  }

  private renderMenu() {
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 60px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('Color Burst', this.width / 2, this.height / 2 - 100)

    this.ctx.font = 'bold 30px Arial'
    this.ctx.fillText('Bubble Shooter', this.width / 2, this.height / 2 - 40)

    this.ctx.font = '20px Arial'
    this.ctx.fillText('Click to Start', this.width / 2, this.height / 2 + 40)
    this.ctx.fillText('20 Levels of Bubble-Popping Fun!', this.width / 2, this.height / 2 + 80)
  }

  private renderGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 50px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    if (this.gameState === 'won') {
      this.ctx.fillStyle = '#2ED573'
      this.ctx.fillText('🎉 YOU WON! 🎉', this.width / 2, this.height / 2 - 80)
      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '30px Arial'
      this.ctx.fillText('All 20 Levels Complete!', this.width / 2, this.height / 2 - 20)
    } else {
      this.ctx.fillStyle = '#FF4757'
      this.ctx.fillText('Game Over', this.width / 2, this.height / 2 - 60)
    }

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 25px Arial'
    this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 40)
    this.ctx.fillText(`Max Combo: x${this.maxCombo}`, this.width / 2, this.height / 2 + 80)

    this.ctx.font = '20px Arial'
    this.ctx.fillText('Click to Play Again', this.width / 2, this.height / 2 + 140)
  }
}
