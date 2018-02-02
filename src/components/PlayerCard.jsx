import React from 'react'
import ReactDOM from 'react-dom'

export default class PlayerCard extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isDragging: false,
      differenceX: 0,
      differenceY: 0,
      originX: 0,
      originY: 0,
      toBeDeleted: false,
      lastTouch: {x: 0, y: 0}
    }
  }

  componentDidMount() {
    // Count loops
    let i = -1
    // Auto position the player
    mainLoop: for (let preferredPosition of this.props.player.positions) {
      i++
      // Support for 2 central defenders
      if (preferredPosition === 'DC') {
        if (this.props.occupiedPositions.find(e => e === 'DC1') === undefined) {
          preferredPosition = "DC1"
        } else {
          preferredPosition = "DC2"
        }
      }
      // Support for special positions
      if (preferredPosition === "ATT") {
        preferredPosition = "BU"
      } else if (preferredPosition === "MDC" || preferredPosition === "MOC") {
        preferredPosition = "MC"
      } else if (preferredPosition === "DLG") {
        preferredPosition = "DG"
      } else if (preferredPosition === "DLD") {
        preferredPosition = "DD"
      }
      for (const position in this.props.tactic) {
        // Check if the position is part of the selected tactic
        if (preferredPosition === position) {
          // Check if position is available
          let isAvailable = true
          for (const occupiedPosition of this.props.occupiedPositions) {
            if (occupiedPosition === position) {
              isAvailable = false
            }
          }
          if (isAvailable) {
            // Position player where he belongs
            this.props.positionPlayer(position, `Player${ this.props.player.id }`)
            break mainLoop
          } else if (i === this.props.player.positions.length - 1) {
            this.findClosestPosition()
            break mainLoop
          }
        }
      }
    }
    // Start drag
    ReactDOM.findDOMNode(this).addEventListener('mousedown', e => {
      this.dragStart(e.clientX, e.clientY)
    })
    ReactDOM.findDOMNode(this).addEventListener('touchstart', e => {
      this.dragStart(e.touches[0].clientX, e.touches[0].clientY)
      // Save position to prepare touchend
      this.setState({
        lastTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY }
      })
      // Add hover style
      ReactDOM.findDOMNode(this).style.background = 'rgba(0, 0, 0, 0.2)'
    })
    // Calculate drag distance
    ReactDOM.findDOMNode(this).addEventListener('mousemove', e => {
      // Only drag if mouse is being pressed
      if (this.state.isDragging) {
        this.dragMove(e.clientX, e.clientY)
      }
    })
    ReactDOM.findDOMNode(this).addEventListener('touchmove', e => {
      // Only drag if mouse is being pressed
      if (this.state.isDragging) {
        // Prevent scroll
        e.preventDefault()
        this.dragMove(e.touches[0].clientX, e.touches[0].clientY)
        // Save position to prepare touchend
        this.setState({
          lastTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY }
        })
      }
    })
    // End drag
    ReactDOM.findDOMNode(this).addEventListener('mouseup', e => {
      if (this.state.isDragging) {
        this.dragEnd(e.clientX, e.clientY)
      }
    })
    ReactDOM.findDOMNode(this).addEventListener('touchend', e => {
      if (this.state.isDragging) {
        // Remove the hover style
        ReactDOM.findDOMNode(this).style.background = 'transparent'
        this.dragEnd(this.state.lastTouch.x, this.state.lastTouch.y)
      }
    })
  }

  findClosestPosition = () => {
    let positionIndex = -1
    const keys = Object.keys(this.props.tactic)
    // Find index of preferred position
    for (let i=0; i<keys.length; i++) {
      if (this.props.player.positions[0] === keys[i]) {
        positionIndex = i
      }
    }
    // Find closest match
    let closestPosition = -1
    for (const position of keys) {
      if (
        closestPosition === -1 ||
        Math.abs(keys.indexOf(position) - positionIndex) < Math.abs(keys.indexOf(position) - closestPosition)
      ) {
        let isAvailable = true
        for (const occupied of this.props.occupiedPositions) {
          if (occupied === position) {
            isAvailable = false
          }
        }
        if (isAvailable) {
          closestPosition = keys.indexOf(position)
        }
      }
    }
    // Add player to pitch
    this.props.positionPlayer(keys[closestPosition], `Player${this.props.player.id}`)
  }

  dragStart = (x, y) => {
    this.setState({
      isDragging: true,
      originX: x,
      originY: y,
      previousMoveX: this.state.previousMoveX,
      previousMoveY: this.state.previousMoveY
    })
    if (this.state.previousMoveX === undefined ) {
      this.setState({ previousMoveX: 0 })
    }
    if (this.state.previousMoveY === undefined ) {
      this.setState({ previousMoveY: 0 })
    }
    ReactDOM.findDOMNode(this).style.zIndex = "400"
    // Show bin
    document.querySelector('.Pitch .Trash').classList.add('visible')
  }

  dragMove = (x, y) => {
    const currentPos = ReactDOM.findDOMNode(this).getBoundingClientRect()
    // Prevent dragging outside of Pitch
    if (
      currentPos.left >= this.props.parentFrame.left &&
      currentPos.right <= this.props.parentFrame.right &&
      currentPos.top >= this.props.parentFrame.top &&
      currentPos.bottom <= this.props.parentFrame.bottom
    ) {
      // Update data
      this.setState({
        differenceX: this.state.previousMoveX + x - this.state.originX,
        differenceY: this.state.previousMoveY + y - this.state.originY
      })
      // Move player card visually
      ReactDOM.findDOMNode(this).style.transform = `
        translateX(${this.state.differenceX}px)
        translateY(${this.state.differenceY}px)
      `
    } else {
      // Prevent further dragging
      this.dragEnd()
      ReactDOM.findDOMNode(this).style.background = 'rgba(255, 0, 0, 0.5)'
      window.setTimeout(() => {
        const activePosition = ReactDOM.findDOMNode(this).dataset.activePosition
        // Delete player
        this.props.unselectPlayer(this.props.player)
        // Reset position indicator
        this.props.unoccupyPosition(activePosition)
        document.querySelector(`[data-position='${activePosition}']`).style.opacity = 1
      }, 500)
    }
    // Get card center relatively to Pitch
    const cardCenterPos = {}
    const pitch = document.querySelector('.Pitch')
    cardCenterPos.x = 100 * (currentPos.left + (currentPos.width / 2) - pitch.getBoundingClientRect().left) / pitch.getBoundingClientRect().width
    cardCenterPos.y = 100 * (currentPos.top + (currentPos.height / 2) - pitch.getBoundingClientRect().top) / pitch.getBoundingClientRect().height
    // Snap to position if dragged next to position indicator
    for (const indicator of Object.keys(this.props.tactic)) {
      if (
        indicator !== ReactDOM.findDOMNode(this).dataset.activePosition &&
        this.getDistance(
          this.props.tactic[indicator].x,
          this.props.tactic[indicator].y,
          cardCenterPos.x,
          cardCenterPos.y
        ) < 8
      ) {
        let isAvailable = true
        for (const occupied of this.props.occupiedPositions) {
          if (occupied === indicator) {
            isAvailable = false
          }
        }
        const activePosition = ReactDOM.findDOMNode(this).dataset.activePosition
        // Swap players is position is occupied
        if (!isAvailable) {
          // Do the reverse travel with the other player
          const cardToMove = document.querySelector(`[data-active-position='${indicator}']`)
          this.props.unoccupyPosition(activePosition)
          this.props.positionPlayer(activePosition, cardToMove.classList[1])
        }
        // Update position indicators
        document.querySelector(`[data-position='${activePosition}']`).style.opacity = 1
        // Prepare next drag
        this.props.unoccupyPosition(activePosition)
        this.setState({
          differenceX: 0,
          differenceY: 0,
        })
        this.dragEnd()
        this.props.positionPlayer(indicator, `Player${this.props.player.id}`)
      }
    }
  }

  dragEnd = () => {
    this.setState({
      isDragging: false,
      previousMoveX: this.state.differenceX,
      previousMoveY: this.state.differenceY
    })
    ReactDOM.findDOMNode(this).style.zIndex = "300"
    // Hide bin
    document.querySelector('.Pitch .Trash').classList.remove('visible')
  }

  // Calculate distance between 2 points
  getDistance = (x0, y0, x1, y1) => {
    // Using Pythagore
    const differenceX = x0 - x1
    const differenceY = y0 - y1
    return Math.sqrt(Math.pow(differenceX, 2) + Math.pow(differenceY, 2))
  }


  render() {
    return(
      <div className={ `PlayerCard Player${this.props.player.id}` } key={this.props.player.id}>
        <img
          className="Portrait"
          src={ this.props.player.photo }
          alt={ this.props.player.name }
          onDragStart={ e => { e.preventDefault() } }
        />
        <p>{this.props.player.shortName}</p>
      </div>
    )
  }
}