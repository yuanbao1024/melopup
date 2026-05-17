import React from 'react'
import SplinePet from './SplinePet'
import FloatingMusic from './FloatingMusic'
import LyricArt from './LyricArt'
import './PetDog.css'

export default function PetDog() {
  return (
    <div className="pet-container-full">
      <SplinePet />
      <FloatingMusic />
      <LyricArt />
    </div>
  )
}
