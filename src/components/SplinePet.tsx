import React, { useCallback } from 'react'
import Spline from '@splinetool/react-spline'

export default function SplinePet() {
  const handleLoad = useCallback((splineApp: any) => {
    try {
      const names = ['Get in touch', 'get-in-touch', 'text', 'Text', 'button', 'Button']
      for (const name of names) {
        const obj = splineApp.findObjectByName?.(name)
        if (obj) {
          obj.visible = false
        }
      }
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="spline-pet-container">
      <Spline
        scene="https://prod.spline.design/miDN5jyvCglPEuf5/scene.splinecode"
        onLoad={handleLoad}
      />
    </div>
  )
}
