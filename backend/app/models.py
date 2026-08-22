from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class Farm(Base):
    __tablename__ = "farms"

    farm_id = Column(String, primary_key=True, index=True)
    crop_type = Column(String, nullable=True)
    sowing_date = Column(Date, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    sensors = relationship("SensorData", back_populates="farm", cascade="all, delete-orphan")
    weather = relationship("WeatherData", back_populates="farm", cascade="all, delete-orphan")
    insights = relationship("AIInsightHistory", back_populates="farm", cascade="all, delete-orphan")


class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String, ForeignKey("farms.farm_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    soil_moisture = Column(Float, nullable=True)
    soil_ph = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)

    farm = relationship("Farm", back_populates="sensors")


class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String, ForeignKey("farms.farm_id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    rainfall_mm = Column(Float, nullable=True)
    sunlight_hours = Column(Float, nullable=True)

    farm = relationship("Farm", back_populates="weather")


class AIInsightHistory(Base):
    __tablename__ = "ai_insight_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String, ForeignKey("farms.farm_id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ml_disease_prediction = Column(Text, nullable=True)
    llm_advice = Column(Text, nullable=True)

    farm = relationship("Farm", back_populates="insights")
