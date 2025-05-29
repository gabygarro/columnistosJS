import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
import pandas as pd
import csv
import random

def load_and_preprocess_data(men_path, women_path):
    names = []
    genders = []
    
    # Read male names
    with open(men_path, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            name = row[0].strip()
            names.append(name)
            genders.append('M')  # All male
    
    # Read female names
    with open(women_path, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            name = row[0].strip()
            names.append(name)
            genders.append('F')  # All female
    
    # Shuffle the data
    combined = list(zip(names, genders))
    random.shuffle(combined)
    names, genders = zip(*combined)
    
    print(f"Loaded {len(names)} samples")
    return names, genders

def preprocess_name(name, max_length=15):
    padded = name.ljust(max_length)[:max_length]
    return [ord(c) / 1000.0 for c in padded]

def train_model(men_path, women_path):
    names, genders = load_and_preprocess_data(men_path, women_path)
    
    # Preprocess names and convert labels
    X = np.array([preprocess_name(name) for name in names])
    y = np.array([0 if g == 'M' else 1 for g in genders])  # M=0, F=1
    
    # Model configuration
    model = Sequential([
        Dense(15, activation='relu', input_shape=(15,)),
        Dense(12, activation='relu'),
        Dense(2, activation='softmax')
    ])
    
    # Compile with MSE loss and custom learning rate
    model.compile(
        optimizer=tf.keras.optimizers.SGD(learning_rate=0.01),
        loss='mse',
        metrics=['accuracy']
    )

    model.fit(
        X,
        tf.keras.utils.to_categorical(y),
        batch_size=15,
        epochs=400,
        verbose=1
    )

    return model

def predict_gender(model, name):
    processed = np.array([preprocess_name(name)])
    prediction = model.predict(processed, verbose=0)[0]
    
    gender = "F" if prediction[1] > prediction[0] else "M"
    confidence = max(prediction)
    
    return {
        "name": name,
        "gender": gender,
        "confidence": float(confidence),
        "male_score": float(prediction[0]),
        "female_score": float(prediction[1])
    }

if __name__ == "__main__":
    # Train using separate files
    model = train_model("men.csv", "women.csv")
    model.save("gender_classifier.keras")
    
    # Test predictions
    test_names = [
        "Gabriela Garro",
        "Juan Jose Vásquez",
        "Fernando Herrera",
        "Shirley Alfaro",
        "Ricardo Apú Chinchilla",
        "Maria Estrada"]
    for name in test_names:
        result = predict_gender(model, name)
        print(f"{result['name']}: {result['gender']} (Confidence: {result['confidence']:.2%})")