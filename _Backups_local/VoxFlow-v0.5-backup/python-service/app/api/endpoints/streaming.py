"""
Streaming transcription endpoints for real-time audio processing.
"""

from fastapi import APIRouter, Request, HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from typing import Dict, Any
import json
import asyncio

from app.core.config import settings

router = APIRouter()


@router.websocket("/ws")
async def websocket_transcription(websocket: WebSocket, request: Request):
    """
    WebSocket endpoint for real-time streaming transcription.
    
    Protocol:
    - Client sends: {"type": "audio_chunk", "data": base64_audio_data}
    - Server sends: {"type": "partial", "text": "...", "confidence": 0.9}
    - Server sends: {"type": "final", "text": "...", "confidence": 0.95}
    """
    
    await websocket.accept()
    logger.info(f"WebSocket connection established: {websocket.client}")
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine or not engine.is_loaded:
            await websocket.send_json({
                "type": "error",
                "message": "Voxtral model not loaded"
            })
            await websocket.close()
            return
        
        # Initialize streaming session
        session_id = await engine.start_streaming_session()
        logger.info(f"Started streaming session: {session_id}")
        
        await websocket.send_json({
            "type": "session_started",
            "session_id": session_id,
            "message": "Streaming session initialized"
        })
        
        while True:
            # Receive message from client
            message = await websocket.receive_json()
            
            if message["type"] == "audio_chunk":
                # Process audio chunk
                audio_data = message.get("data")
                if audio_data:
                    result = await engine.process_streaming_chunk(
                        session_id, 
                        audio_data
                    )
                    
                    if result:
                        await websocket.send_json(result)
            
            elif message["type"] == "end_session":
                # Finalize streaming session
                final_result = await engine.end_streaming_session(session_id)
                await websocket.send_json({
                    "type": "session_ended",
                    "final_result": final_result
                })
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {websocket.client}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        # Cleanup streaming session
        if 'session_id' in locals():
            await engine.cleanup_streaming_session(session_id)


@router.post("/start")
async def start_streaming_session(request: Request) -> Dict[str, Any]:
    """Start a new streaming transcription session."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine or not engine.is_loaded:
            raise HTTPException(
                status_code=503,
                detail="Voxtral model not loaded"
            )
        
        session_id = await engine.start_streaming_session()
        
        return {
            "session_id": session_id,
            "status": "active",
            "websocket_url": "/stream/ws",
            "config": {
                "chunk_size": settings.CHUNK_SIZE,
                "sample_rate": settings.SAMPLE_RATE,
                "overlap": settings.OVERLAP_SIZE,
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to start streaming session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start streaming session: {str(e)}"
        )


@router.post("/end/{session_id}")
async def end_streaming_session(
    session_id: str, 
    request: Request
) -> Dict[str, Any]:
    """End a streaming transcription session."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            raise HTTPException(
                status_code=503,
                detail="Engine not available"
            )
        
        final_result = await engine.end_streaming_session(session_id)
        
        return {
            "session_id": session_id,
            "status": "ended",
            "final_result": final_result,
        }
        
    except Exception as e:
        logger.error(f"Failed to end streaming session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to end streaming session: {str(e)}"
        )


@router.get("/sessions")
async def get_active_sessions(request: Request) -> Dict[str, Any]:
    """Get list of active streaming sessions."""
    
    try:
        engine = getattr(request.app.state, 'voxtral_engine', None)
        if not engine:
            return {"active_sessions": []}
        
        sessions = await engine.get_active_sessions()
        
        return {
            "active_sessions": sessions,
            "total_count": len(sessions),
        }
        
    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get active sessions: {str(e)}"
        )